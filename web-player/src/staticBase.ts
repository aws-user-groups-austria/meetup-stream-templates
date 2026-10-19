/**
 * staticFile() resolves from the domain root unless told otherwise, so served
 * from /present/ every font and logo would 404. Point it at the folder this page
 * lives in. This module must be imported before anything from ../../src: the
 * scenes register their fonts (through staticFile) the moment they load.
 */
import type {} from "remotion";

const here = new URL(".", window.location.href).pathname.replace(/\/$/, "");
if (here) window.remotion_staticBase = here;

// The built player (the website's /present/) carries no Amazon Ember files: ask
// only for the installed font there, so no request 404s. The dev server
// serves ../public/fonts/amazon-ember/ when `make fonts` has filled it.
if (import.meta.env.PROD) window.meetupFontFiles = false;
