// ===== CONFIGURATION ET CONSTANTES =====

const CONFIG = {
  SERVER_URL: "http://localhost:3000",
  PLACEHOLDER_IMAGE: "./assets/imgs/placeholder/placeholder.jpg",
  STORAGE_KEYS: {
    PLAYER: "player",
    PLAYLIST: "playlist",
  },
};

// ===== CONSOMMATION API MUSIC LOCAL =====

async function initializeMusicLibrary() {
  try {
    const response = await fetch(`${CONFIG.SERVER_URL}/spotify-music`);

    if (!response.ok) {
      throw new Error(`Erreur serveur: ${response.status}`);
    }

    const data = await response.json();
    console.log(`Bibliothèque chargée: ${data.length} pistes`);
    return data;
  } catch (error) {
    console.error("Erreur chargement bibliothèque:", error);
    return [];
  }
}

// ===== LOCAL STORAGE =====

const Storage = {
  // Récupère valeur du localStorage

  get(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (error) {
      console.warn(`Erreur lecture storage pour ${key}:`, error);
      return fallback;
    }
  },

  // Sauvegarde valeur dans localStorage

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Erreur sauvegarde storage pour ${key}:`, error);
    }
  },
};

// État du lecteur restauré depuis le localStorage

const playerState = Storage.get(CONFIG.STORAGE_KEYS.PLAYER, {
  currentId: null,
  currentTime: 0,
});

// ===== VARIABLES GLOBALES POUR ETATS =====

const audio = new Audio();
let library = [];
let currentView = "albums";
let currentAlbum = null;
let currentTrackIndex = 0;

// ===== RECUPERATION DES ELEMENTS DU DOM =====

const DOM = {
  trackList: document.getElementById("trackList"),
  albumsGrid: document.getElementById("albumsGrid"),
  backButton: document.getElementById("backButton"),
  playPauseBtn: document.getElementById("playPause"),
  progress: document.getElementById("progress"),
  timeDisplay: document.getElementById("time"),
  currentArtwork: document.getElementById("currentArtwork"),
  currentTitle: document.getElementById("currentTitle"),
  currentArtist: document.getElementById("currentArtist"),
  nextBtn: document.getElementById("next"),
  prevBtn: document.getElementById("prev"),
};

// Vérifie que tous les éléments DOM sont présents

function validateDOMElements() {
  const missingElements = [];

  Object.entries(DOM).forEach(([key, element]) => {
    if (!element) {
      missingElements.push(key);
    }
  });

  if (missingElements.length > 0) {
    console.error("Éléments DOM manquants:", missingElements);
    return false;
  }

  return true;
}

// ===== FONCTIONS UTILITAIRES =====

// Formate le temps en minutes:secondes

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Vérifie si les images sont valides

function isValidImageData(pictureData) {
  return (
    pictureData &&
    typeof pictureData === "string" &&
    pictureData.startsWith("data:image/")
  );
}

// Obtient l'URL image sécurisée avec fallback

function getSafeImageUrl(pictureData) {
  return isValidImageData(pictureData) ? pictureData : CONFIG.PLACEHOLDER_IMAGE;
}

// Crée un élément HTML

function createElement(tag, className = "", innerHTML = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (innerHTML) element.innerHTML = innerHTML;
  return element;
}

// ===== GESTION DE L'AFFICHAGE =====

// Affichage des albums

function renderAlbums() {
  DOM.albumsGrid.innerHTML = "";

  // Groupe les pistes par album (évite les doublons)
  const albumsMap = new Map();

  library.forEach((track) => {
    if (!albumsMap.has(track.album)) {
      const albumTracks = library.filter((t) => t.album === track.album);
      albumsMap.set(track.album, {
        name: track.album,
        artist: track.artist,
        tracks: albumTracks,
        coverImage: getSafeImageUrl(track.picture),
      });
    }
  });

  // Génère les cartes d'albums

  albumsMap.forEach((album) => {
    const albumDiv = createElement("div", "album-card");

    albumDiv.innerHTML = `
      <div
                  class="relative col-span-1 flex flex-col items-center justify-center h-[220px overflow-hidden px-2 mt-5"
                >
                  <a
                    class="absolute inset-0"
                  ></a>

                  <img
                    src="${album.coverImage}"
                    alt="${album.name}"
                    class="w-full h-full object-cover rounded-[7px]"
                  />

                  <h2 class="text-center text-sm font-normal text-white my-4">
                    ${album.name}
                  </h2>
                </div>

    `;

    albumDiv.addEventListener("click", () => showAlbumTracks(album.name));
    DOM.albumsGrid.appendChild(albumDiv);
  });
}

// Affiche infos album spécifique

function showAlbumTracks(albumName) {
  currentView = "tracks";
  currentAlbum = albumName;

  // Gestion de l'affichage des vues
  DOM.albumsGrid.style.display = "none";
  DOM.trackList.style.display = "block";
  DOM.backButton.style.display = "block";

  // Filtre et affiche les pistes de l'album
  const albumTracks = library.filter((track) => track.album === albumName);
  renderTracks(albumTracks);
}

// Affiche la liste des pistes

function renderTracks(tracks) {
  // Vide la liste avant re-render
  DOM.trackList.innerHTML = "";

  // Fragment pour optimiser les manipulations DOM
  const fragment = document.createDocumentFragment();

  tracks.forEach((track, index) => {
    const trackDiv = createElement("div", "track");
    const isCurrentTrack = library.indexOf(track) === currentTrackIndex;

    // Ajoute la classe active sur piste en cours
    if (isCurrentTrack) {
      trackDiv.classList.add("active");
    }

    trackDiv.innerHTML = `
      <img src="${getSafeImageUrl(track.picture)}" 
           alt="Cover de ${track.title}"
           loading="lazy">
      <div class="track-info">
        <strong>${track.title}</strong><br>
        <small>${track.artist}</small>
      </div>
      <span class="duration">${formatTime(track.duration)}</span>
    `;

    // Clic pour lancer la piste
    trackDiv.addEventListener("click", () => {
      currentTrackIndex = library.indexOf(track);
      loadTrack();
      audio.play().catch((error) => {
        console.warn("Erreur lecture audio:", error);
      });
    });

    fragment.appendChild(trackDiv);
  });

  DOM.trackList.appendChild(fragment);
}

// ===== GESTION DU LECTEUR AUDIO =====

// Met à jour l'affichage "En cours de lecture"

function updateNowPlaying() {
  const track = library[currentTrackIndex];
  if (!track) {
    // Réinitialise l'affichage si aucune piste
    DOM.currentArtwork.src = CONFIG.PLACEHOLDER_IMAGE;
    DOM.currentArtwork.alt = "Aucune piste";
    DOM.currentTitle.textContent = "Aucune piste";
    DOM.currentArtist.textContent = "-";
    document.title = "Lecteur Audio";
    return;
  }

  // Met à jour avec les informations de la piste
  DOM.currentArtwork.src = getSafeImageUrl(track.picture);
  DOM.currentArtwork.alt = `Cover de ${track.title}`;
  DOM.currentTitle.textContent = track.title;
  DOM.currentArtist.textContent = track.artist;

  // Met à jour le titre de la page
  document.title = `Spotify | ${track.title} - ${track.artist}`;
}

// Charge une nouvelle piste dans le lecteur

function loadTrack() {
  const track = library[currentTrackIndex];
  if (!track) {
    console.warn("Aucune piste à charger");
    return;
  }

  // Configure l'audio
  audio.src = `${CONFIG.SERVER_URL}/songs/${track.file}`;
  audio.currentTime = 0;

  // Sauvegarde l'état
  Storage.set(CONFIG.STORAGE_KEYS.PLAYER, {
    currentId: track.id,
    currentTime: 0,
  });

  // Met à jour l'interface
  updateNowPlaying();

  // Re-render les pistes si on est dans la vue album
  if (currentView === "tracks" && currentAlbum) {
    const albumTracks = library.filter((t) => t.album === currentAlbum);
    renderTracks(albumTracks);
  }

  DOM.playPauseBtn.textContent = "⏸️";
}

// Piste suivante auto

function playNext() {
  if (currentView === "tracks" && currentAlbum) {
    // Navigation dans l'album courant
    const albumTracks = library.filter((track) => track.album === currentAlbum);
    const currentIndexInAlbum = albumTracks.findIndex(
      (track) => library.indexOf(track) === currentTrackIndex
    );
    const nextIndexInAlbum = (currentIndexInAlbum + 1) % albumTracks.length;
    currentTrackIndex = library.indexOf(albumTracks[nextIndexInAlbum]);
  } else {
    // Navigation dans toute la bibliothèque
    currentTrackIndex = (currentTrackIndex + 1) % library.length;
  }

  loadTrack();
  audio.play().catch((error) => console.warn("Erreur lecture:", error));
}

// Piste précédente

function playPrevious() {
  if (currentView === "tracks" && currentAlbum) {
    // Navigation dans l'album courant
    const albumTracks = library.filter((track) => track.album === currentAlbum);
    const currentIndexInAlbum = albumTracks.findIndex(
      (track) => library.indexOf(track) === currentTrackIndex
    );
    const prevIndexInAlbum =
      (currentIndexInAlbum - 1 + albumTracks.length) % albumTracks.length;
    currentTrackIndex = library.indexOf(albumTracks[prevIndexInAlbum]);
  } else {
    // Navigation dans toute la bibliothèque
    currentTrackIndex =
      (currentTrackIndex - 1 + library.length) % library.length;
  }

  loadTrack();
  audio.play().catch((error) => console.warn("Erreur lecture:", error));
}

// Retourne à la vue des albums

function showAlbumsView() {
  currentView = "albums";
  currentAlbum = null;

  // Gestion de l'affichage des vues
  DOM.albumsGrid.style.display = "grid";
  DOM.trackList.style.display = "none";
  DOM.backButton.style.display = "none";

  renderAlbums();
}

// ===== GESTIONNAIRES D'ÉVÉNEMENTS DU CONTROLE AUDIO =====

// Gestion lecture/pause

DOM.playPauseBtn.addEventListener("click", () => {
  if (audio.paused) {
    audio
      .play()
      .then(() => {
        DOM.playPauseBtn.textContent = "⏸️";
      })
      .catch((error) => {
        console.warn("Erreur lecture audio:", error);
      });
  } else {
    audio.pause();
    DOM.playPauseBtn.textContent = "▶️";
  }
});

// Gestionnaires navigation
DOM.nextBtn.addEventListener("click", playNext);
DOM.prevBtn.addEventListener("click", playPrevious);
DOM.backButton.addEventListener("click", showAlbumsView);

// Mise à jour de la progression et sauvegarde de l'état

audio.addEventListener("timeupdate", () => {
  if (audio.duration) {
    DOM.progress.value = (audio.currentTime / audio.duration) * 100;
    DOM.timeDisplay.textContent = `${formatTime(
      audio.currentTime
    )} / ${formatTime(audio.duration)}`;

    // Sauvegarde périodique de la position
    const track = library[currentTrackIndex];
    if (track) {
      Storage.set(CONFIG.STORAGE_KEYS.PLAYER, {
        currentId: track.id,
        currentTime: audio.currentTime,
      });
    }
  }
});

// Gestion du timeur (déplacement dans la piste)

DOM.progress.addEventListener("input", () => {
  if (audio.duration) {
    audio.currentTime = (DOM.progress.value / 100) * audio.duration;
  }
});

// Lecture automatique de la piste suivante

audio.addEventListener("ended", playNext);

// ===== INITIALISATION =====

// Initialisation principale de l'application

async function init() {
  try {
    // Vérifie que tous les éléments DOM sont présents
    if (!validateDOMElements()) {
      console.error("Impossible d'initialiser: éléments DOM manquants");
      return;
    }

    // Charge la bibliothèque musicale depuis api
    library = await initializeMusicLibrary();

    if (library.length === 0) {
      console.warn("Aucune piste trouvée dans la bibliothèque");
      // Affiche l'état vide
      updateNowPlaying();
      return;
    }

    // Restaure la piste en cours ou utilise la première
    const savedTrackIndex = library.findIndex(
      (t) => t.id === playerState.currentId
    );
    currentTrackIndex = savedTrackIndex >= 0 ? savedTrackIndex : 0;

    // Initialise l'interface
    renderAlbums();
    loadTrack();

    // Restaure la position de lecture
    if (playerState.currentTime > 0) {
      // Attend que les métadonnées audio soient chargées
      audio.addEventListener(
        "loadedmetadata",
        () => {
          if (playerState.currentTime < audio.duration) {
            audio.currentTime = playerState.currentTime;
          }
        },
        { once: true }
      );
    }

    console.log("Application initialisée avec succès");
  } catch (error) {
    console.error("Erreur d'initialisation:", error);
    updateNowPlaying();
  }
}

// ===== DÉMARRAGE DE L'APPLICATION =====

// Démarre l'application une fois le DOM chargé

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
