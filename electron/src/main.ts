import { app, BrowserWindow, dialog } from "electron";
import path from "path";
import { config } from "dotenv";
import { registerAllHandlers } from "./ipc/index";

config({ path: path.join(__dirname, "../../../.env") });

const isDev = process.env["NODE_ENV"] === "development";
const wantDeveloperToolsToOpen = process.env["OPEN_DEV_TOOLS"] === "true";

function createWindow(): BrowserWindow {
	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		minWidth: 1100,
		minHeight: 640,
		titleBarStyle: "hiddenInset",
		trafficLightPosition: { x: 16, y: 18 },
		backgroundColor: "#0d1117",
		show: false,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			nodeIntegration: false,
			sandbox: false,
			webSecurity: true,
		},
	});

	win.once("ready-to-show", () => win.show());

	if (isDev) {
		win.loadURL("http://localhost:4200");
		if (wantDeveloperToolsToOpen) {
			win.webContents.openDevTools({ mode: "detach" });
		}
	} else {
		win.loadFile(path.join(__dirname, "../../../dist/index.html"));
	}

	win.webContents.on("will-navigate", (event, url) => {
		if (!isDev || !url.startsWith("http://localhost:4200")) {
			event.preventDefault();
		}
	});

	return win;
}

let mainWindow: BrowserWindow | null = null;

app.whenReady().then(() => {
	mainWindow = createWindow();
	registerAllHandlers(mainWindow);

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			mainWindow = createWindow();
			registerAllHandlers(mainWindow);
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
	dialog.showErrorBox("Unexpected Error", error.message);
});
