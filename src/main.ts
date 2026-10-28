import { initRouter } from "./router";
import { initKeyboardNavigation } from "./input/keyboardNav";
import { initHardwareClient } from "./hardware/hardwareClient";

import "./styles/fonts.css";
import "./styles/game.css";
import "./styles/screens.css";

(function bootstrapTheme() {
  // Vedno svetla tema, dokler je gumb za temo skrit
  document.documentElement.setAttribute("data-theme", "light");
})();

initRouter();
initKeyboardNavigation();
initHardwareClient();
