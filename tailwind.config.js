module.exports = {
  content: [
    "./**/*.html",   
    "./**/*.js",     
    "./assets/css/**/*.css",  
  ],
  theme: {
    extend: {
      fontSize: {
        'base-mini':   '16px',
        'base':   '24px',   
      },
      colors: { 
        'primary': '#2B892E', 
        'secondary': '#3D3D3D', 
        'secondary-two': '#BDBDBD', 
        'secondary-three': '#DCDCDC', 
      },
      backgroundImage: {
        'grid-bg': "url('./assets/images/grid-bg.png')",
        'hero-bg': "url('./assets/images/bg-hero.png')",
        'grid-bento': "url('./assets/images/grid-bento.png')",
      },
    },
  },
  plugins: [],
}
