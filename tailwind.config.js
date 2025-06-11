module.exports = {
  content: ["./**/*.html", "./**/*.js", "./assets/css/**/*.css"],
  theme: {
    extend: {
      fontSize: {
        "base-mini": "18px",
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        inter: ["Inter", "sans-serif"],
      },
      colors: {
        primary: "#2B892E",
        secondary: "#121212",
      },
      backgroundImage: {
        "custom-gradient":
          "linear-gradient(177.8deg, #1F1F1F -32.16%, #111111 98.22%)",
      },
      borderRadius: {
        base: "8px",
      },
    },
  },
  plugins: [],
};
