
import * as vscode from 'vscode';

type Favorite = {
	type: 'local' | 'github';
	path?: string;
	url?: string;
	label: string;
};

export function activate(context: vscode.ExtensionContext) {
	console.log('Copilot Instructions Updater extension activated.');

	// Register Hello World command
	const helloDisposable = vscode.commands.registerCommand('copilot-instructions-updater.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from Copilot Instructions Updater!');
	});
	context.subscriptions.push(helloDisposable);

	// Register update command
	const updateDisposable = vscode.commands.registerCommand('copilot-instructions-updater.updateCopilotInstructions', async () => {
		await promptAndUpdateCopilotInstructions();
	});
	context.subscriptions.push(updateDisposable);

	// Prompt on activation (startup)
	setTimeout(() => {
		promptAndUpdateCopilotInstructions();
	}, 2000); // Delay to avoid interrupting VS Code startup
}

async function promptAndUpdateCopilotInstructions() {
	const favorites = getFavorites();
	const options = [
		...(favorites.length > 0 ? ['Select favorite'] : []),
		'Select local file',
		'Enter GitHub URL',
		'Cancel'
	];
	const choice = await vscode.window.showQuickPick(options, {
		placeHolder: 'How would you like to update .github/copilot-instructions.md?'
	});
	if (choice === 'Select favorite') {
		const favChoice = await vscode.window.showQuickPick(favorites.map(f => f.label), {
			placeHolder: 'Select your favorite copilot-instructions.md source'
		});
		const fav = favorites.find(f => f.label === favChoice);
		if (fav) {
			await handleFavorite(fav);
		}
	} else if (choice === 'Select local file') {
		const fileUri = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: { 'Markdown': ['md'] }
		});
		if (fileUri && fileUri[0]) {
			const content = await vscode.workspace.fs.readFile(fileUri[0]);
			await confirmAndWriteCopilotInstructions(content);
			await maybeSaveFavorite({ type: 'local', path: fileUri[0].fsPath, label: fileUri[0].fsPath });
		}
	} else if (choice === 'Enter GitHub URL') {
		const url = await vscode.window.showInputBox({
			prompt: 'Enter the raw GitHub URL for the Markdown file',
			placeHolder: 'https://github.com/user/repo/raw/main/filename.md'
		});
		if (url) {
			try {
				const response = await fetch(url);
				if (!response.ok) throw new Error('Failed to fetch file');
				const content = await response.text();
				await confirmAndWriteCopilotInstructions(Buffer.from(content));
				await maybeSaveFavorite({ type: 'github', url, label: url });
			} catch (err) {
				let message = 'Error fetching file.';
				if (err instanceof Error) {
					message += ' ' + err.message;
				}
				vscode.window.showErrorMessage(message);
			}
		}
	}
}

function getFavorites(): Favorite[] {
	const config = vscode.workspace.getConfiguration('copilotInstructionsUpdater');
	return config.get<Favorite[]>('favorites', []);
}

async function maybeSaveFavorite(fav: Favorite) {
	const save = await vscode.window.showQuickPick(['Yes', 'No'], { placeHolder: 'Save this source as a favorite?' });
	if (save === 'Yes') {
		const config = vscode.workspace.getConfiguration('copilotInstructionsUpdater');
		const favorites = config.get<Favorite[]>('favorites', []);
		favorites.push(fav);
		await config.update('favorites', favorites, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage('Favorite saved!');
	}
}

async function handleFavorite(fav: Favorite) {
	if (fav.type === 'local') {
		try {
			const fileUri = vscode.Uri.file(fav.path!);
			const content = await vscode.workspace.fs.readFile(fileUri);
			await confirmAndWriteCopilotInstructions(content);
			vscode.window.showInformationMessage('.github/copilot-instructions.md updated from favorite local file.');
		} catch (e) {
			vscode.window.showErrorMessage('Could not read favorite local file.');
		}
	} else if (fav.type === 'github') {
		try {
			const response = await fetch(fav.url!);
			if (!response.ok) throw new Error('Failed to fetch file');
			const content = await response.text();
			await confirmAndWriteCopilotInstructions(Buffer.from(content));
			vscode.window.showInformationMessage('.github/copilot-instructions.md updated from favorite GitHub URL.');
		} catch (e) {
			vscode.window.showErrorMessage('Could not fetch favorite GitHub file.');
		}
	}
}

async function confirmAndWriteCopilotInstructions(content: Uint8Array) {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	if (!workspaceFolders) {
		vscode.window.showErrorMessage('No workspace folder found.');
		return;
	}
	const rootUri = workspaceFolders[0].uri;
	const githubDir = vscode.Uri.joinPath(rootUri, '.github');
	try {
		// Ensure .github directory exists
		await vscode.workspace.fs.createDirectory(githubDir);
	} catch (e) { }
	const targetFile = vscode.Uri.joinPath(githubDir, 'copilot-instructions.md');
	let shouldWrite = true;
	try {
		await vscode.workspace.fs.stat(targetFile);
		// File exists, ask for confirmation
		const answer = await vscode.window.showQuickPick(['Overwrite', 'Cancel'], { placeHolder: 'copilot-instructions.md already exists. Overwrite?' });
		shouldWrite = answer === 'Overwrite';
	} catch (e) {
		// File does not exist, safe to write
		shouldWrite = true;
	}
	if (shouldWrite) {
		await vscode.workspace.fs.writeFile(targetFile, content);
		vscode.window.showInformationMessage('.github/copilot-instructions.md updated.');
	} else {
		vscode.window.showInformationMessage('No changes made to copilot-instructions.md.');
	}
}

// This method is called when your extension is deactivated
export function deactivate() { }
