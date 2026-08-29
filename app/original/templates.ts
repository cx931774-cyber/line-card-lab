import acnhPassport1 from "./templates/acnh-passport-1.html?raw";
import acnhPostcard1 from "./templates/acnh-postcard-1.html?raw";
import chatbotTw1 from "./templates/chatbot-tw-1.html?raw";
import chatgpt1 from "./templates/chatgpt-1.html?raw";
import csv from "./templates/csv.html?raw";
import facebookPostLink1 from "./templates/facebook-post-link-1.html?raw";
import googleSheet from "./templates/google-sheet.html?raw";
import json5 from "./templates/json5.html?raw";
import psprint3949 from "./templates/psprint-3949.html?raw";
import psprint592 from "./templates/psprint-592.html?raw";

export const ORIGINAL_HTML = {
  "acnh-passport-1": acnhPassport1,
  "acnh-postcard-1": acnhPostcard1,
  "chatbot-tw-1": chatbotTw1,
  "chatgpt-1": chatgpt1,
  csv,
  "facebook-post-link-1": facebookPostLink1,
  "google-sheet": googleSheet,
  json5,
  "psprint-3949": psprint3949,
  "psprint-592": psprint592,
} as const;
