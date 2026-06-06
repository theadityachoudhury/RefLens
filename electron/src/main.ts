import { app, BrowserWindow, dialog, Menu } from "electron";
import path from "path";
import { config } from "dotenv";
import { registerGlobalHandlers } from "./ipc/index";
import { checkForUpdatesOnStartup } from "./ipc/updater.ipc";
import { readSettings } from "./settings/settings.store";

config({ path: path.join(__dirname, "../../../.env") });

const isDev = process.env["NODE_ENV"] === "development";
const wantDeveloperToolsToOpen = process.env["OPEN_DEV_TOOLS"] === "true";

export function createWindow(): BrowserWindow {
	const win = new BrowserWindow({
		width: 1440,
		height: 900,
		titleBarStyle: "hiddenInset",
		trafficLightPosition: { x: 16, y: 14 },
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
	} else {
		win.loadFile(path.join(__dirname, "../../../dist/browser/index.html"));
	}

	win.webContents.once("did-finish-load", () => {
		const openDevTools =
			wantDeveloperToolsToOpen || readSettings().openDevTools;
		if (openDevTools) win.webContents.openDevTools({ mode: "detach" });
	});

	win.webContents.on("will-navigate", (event, url) => {
		if (!isDev || !url.startsWith("http://localhost:4200")) {
			event.preventDefault();
		}
	});

	return win;
}

app.whenReady().then(() => {
	// Register IPC channels once — handlers use event.sender to route per-window
	registerGlobalHandlers(createWindow);
	createWindow();

	if (!isDev) checkForUpdatesOnStartup();

	if (process.platform === "darwin") {
		// macOS: native menu lives in the system menu bar outside the window — keep it
		const menu = Menu.buildFromTemplate([
			{
				label: app.name,
				submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
			},
			{
				label: "File",
				submenu: [
					{
						label: "New Window",
						accelerator: "CmdOrCtrl+N",
						click: () => createWindow(),
					},
				],
			},
			{
				label: "Edit",
				submenu: [
					{ role: "undo" },
					{ role: "redo" },
					{ type: "separator" },
					{ role: "cut" },
					{ role: "copy" },
					{ role: "paste" },
					{ role: "selectAll" },
				],
			},
		]);
		Menu.setApplicationMenu(menu);
	} else {
		// Windows/Linux: suppress the native menu bar — the Angular titlebar renders its own
		Menu.setApplicationMenu(null);
	}

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) createWindow();
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

process.on("uncaughtException", (error) => {
	dialog.showErrorBox("Unexpected Error", error.message);
});
