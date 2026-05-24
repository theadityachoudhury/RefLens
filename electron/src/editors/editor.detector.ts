// TODO: Replace sips-extracted icons with bundled custom SVG/PNG icons per editor
// (vscode, cursor, windsurf, zed, webstorm, fleet, sublime, nova, xcode, etc.)
// so icons are crisp at any size, load instantly, and work on all platforms without
// shelling out to sips/plutil. Store them in src/assets/icons/editors/<id>.png.

// TODO: Add support for manually specifying a custom editor path (e.g. for portable apps or non-standard installs) and persist that choice in settings.
// This would involve adding a UI for browsing to an executable, validating it, and then saving the path in settings.
// The detection logic would then need to check the custom path first before falling back to auto-detection.
// We also have to ask user, how to pass repoPath to the custom editor, as different editors have different CLI args (e.g. --folder-uri for vscode, --project for jetbrains, etc.).

import fs from "fs";
import path from "path";
import os from "os";
import { app } from "electron";
import { spawn, execFileSync } from "child_process";
import type { EditorInfo } from "../../../shared/ipc-api.types";

interface DetectedEditor {
	id: string;
	name: string;
	appPath: string;
}

interface EditorDef {
	id: string;
	name: string;
	mac?: string[];
	win?: string[];
	linux?: string[];
}

const home = os.homedir();
const localAppData = process.env["LOCALAPPDATA"] ?? "";
const programFiles = process.env["PROGRAMFILES"] ?? "C:\\Program Files";

const EDITOR_DEFS: EditorDef[] = [
	{
		id: "vscode",
		name: "VS Code",
		mac: [
			"/Applications/Visual Studio Code.app",
			path.join(home, "Applications/Visual Studio Code.app"),
		],
		win: [path.join(localAppData, "Programs", "Microsoft VS Code", "Code.exe")],
		linux: ["/usr/bin/code", "/snap/bin/code", "/usr/local/bin/code"],
	},
	{
		id: "vscode-insiders",
		name: "VS Code Insiders",
		mac: [
			"/Applications/Visual Studio Code - Insiders.app",
			path.join(home, "Applications/Visual Studio Code - Insiders.app"),
		],
		win: [
			path.join(
				localAppData,
				"Programs",
				"Microsoft VS Code Insiders",
				"Code - Insiders.exe",
			),
		],
	},
	{
		id: "cursor",
		name: "Cursor",
		mac: [
			"/Applications/Cursor.app",
			path.join(home, "Applications/Cursor.app"),
		],
		win: [path.join(localAppData, "Programs", "cursor", "Cursor.exe")],
		linux: ["/usr/bin/cursor", path.join(home, ".local/bin/cursor")],
	},
	{
		id: "windsurf",
		name: "Windsurf",
		mac: [
			"/Applications/Windsurf.app",
			path.join(home, "Applications/Windsurf.app"),
		],
		win: [path.join(localAppData, "Programs", "Windsurf", "Windsurf.exe")],
		linux: ["/usr/bin/windsurf"],
	},
	{
		id: "zed",
		name: "Zed",
		mac: ["/Applications/Zed.app", path.join(home, "Applications/Zed.app")],
		linux: [path.join(home, ".local/bin/zed"), "/usr/bin/zed"],
	},
	{
		id: "webstorm",
		name: "WebStorm",
		mac: [
			"/Applications/WebStorm.app",
			path.join(home, "Applications/WebStorm.app"),
		],
	},
	{
		id: "fleet",
		name: "Fleet",
		mac: ["/Applications/Fleet.app", path.join(home, "Applications/Fleet.app")],
	},
	{
		id: "sublime",
		name: "Sublime Text",
		mac: [
			"/Applications/Sublime Text.app",
			path.join(home, "Applications/Sublime Text.app"),
		],
		win: [path.join(programFiles, "Sublime Text", "sublime_text.exe")],
		linux: ["/usr/bin/subl", "/opt/sublime_text/sublime_text"],
	},
	{
		id: "nova",
		name: "Nova",
		mac: ["/Applications/Nova.app"],
	},
	{
		id: "xcode",
		name: "Xcode",
		mac: ["/Applications/Xcode.app"],
	},
];

function getCandidates(def: EditorDef): string[] {
	if (process.platform === "darwin") return def.mac ?? [];
	if (process.platform === "win32") return def.win ?? [];
	return def.linux ?? [];
}

// On macOS, app.getFileIcon and nativeImage both return the dark-mode template
// (white) version. Use sips — a macOS built-in — to convert the .icns directly
// to a PNG, bypassing any system appearance rendering.
function getIconViaSips(appPath: string): string {
	try {
		const plistPath = path.join(appPath, "Contents", "Info.plist");
		if (!fs.existsSync(plistPath)) return "";
		const iconName = execFileSync(
			"plutil",
			["-extract", "CFBundleIconFile", "raw", plistPath],
			{
				encoding: "utf8",
			},
		).trim();
		const icnsFile = iconName.endsWith(".icns") ? iconName : `${iconName}.icns`;
		const icnsPath = path.join(appPath, "Contents", "Resources", icnsFile);
		if (!fs.existsSync(icnsPath)) return "";

		const tmpPng = path.join(
			os.tmpdir(),
			`reflens-icon-${path.basename(appPath, ".app")}.png`,
		);
		execFileSync(
			"sips",
			[
				"-s",
				"format",
				"png",
				icnsPath,
				"--out",
				tmpPng,
				"--resampleWidth",
				"48",
			],
			{
				timeout: 5000,
			},
		);
		const data = fs.readFileSync(tmpPng);
		try {
			fs.unlinkSync(tmpPng);
		} catch {
			/* ignore */
		}
		return `data:image/png;base64,${data.toString("base64")}`;
	} catch {
		return "";
	}
}

async function getIconForEditor(editor: DetectedEditor): Promise<string> {
	if (process.platform === "darwin" && editor.appPath.endsWith(".app")) {
		const icon = getIconViaSips(editor.appPath);
		if (icon) return icon;
	}
	// Fallback for Windows / Linux
	try {
		const img = await app.getFileIcon(editor.appPath, { size: "large" });
		if (!img.isEmpty())
			return `data:image/png;base64,${img.toPNG().toString("base64")}`;
	} catch {
		/* ignore */
	}
	return "";
}

let cachedEditors: DetectedEditor[] | null = null;

function detectEditors(): DetectedEditor[] {
	if (cachedEditors) return cachedEditors;
	const found: DetectedEditor[] = [];
	for (const def of EDITOR_DEFS) {
		for (const candidate of getCandidates(def)) {
			if (fs.existsSync(candidate)) {
				found.push({ id: def.id, name: def.name, appPath: candidate });
				break;
			}
		}
	}
	cachedEditors = found;
	return found;
}

export async function getEditorsWithIcons(): Promise<EditorInfo[]> {
	const detected = detectEditors();
	return Promise.all(
		detected.map(async (e) => ({
			id: e.id,
			name: e.name,
			icon: await getIconForEditor(e),
		})),
	);
}

export function openInEditor(repoPath: string, editorId: string): void {
	const editors = detectEditors();
	const editor = editors.find((e) => e.id === editorId);
	if (!editor) throw new Error(`Editor "${editorId}" not found`);

	if (process.platform === "darwin") {
		spawn("open", ["-a", editor.appPath, repoPath], { detached: true });
	} else if (process.platform === "win32") {
		spawn(editor.appPath, [repoPath], { detached: true, shell: true });
	} else {
		spawn(editor.appPath, [repoPath], { detached: true });
	}
}
