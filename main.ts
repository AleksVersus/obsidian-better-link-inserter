import { Editor, MarkdownView, Plugin, EditorPosition } from "obsidian";

export default class BetterMarkdownLinkInserterPlugin extends Plugin {
	private hasEnteringLinkPath: boolean = false;
	private enteringObserverPosition: EditorPosition = { line: 0, ch: 0 };
	private alias:string = "";
	private editorChangeEventRef: any = null;
	
	async onload() {
		this.addCommand({
			id: "use-selected-word-as-alias",
			name: "Insert an internal link (using selected word as alias if possible)",
			editorCallback: this.insertInternalLinkWithAlias,
		});
		this.editorChangeEventRef = this.app.workspace.on("editor-change", (editor: Editor, markdownView: MarkdownView) => {
			if (this.hasEnteringLinkPath) {
				const start = this.enteringObserverPosition;
				const end = { line: start.line, ch: start.ch + 2 };
				const linkStartWith = editor.getRange(start, end);
				if (linkStartWith !== "[[") {
					// ссылка больше не начинается с [[, значит она уже превратилась в md.
					// можно md спокойно обработать, но пока что излечём
					const cursorPosition = editor.getCursor();
					const mdLink = editor.getRange(start, cursorPosition);
					this.hasEnteringLinkPath = false;
					// Парсим markdown ссылку
					const linkMatch = mdLink.match(/\[([^\]]+)\]\(([^)]+)\)/);
					if (linkMatch) {
						const [, currentAlias, path] = linkMatch;
						// Заменяем alias если он есть
						const newAlias = this.alias || currentAlias || "";
						const newMdLink = newAlias ? `[${newAlias}](${path})` : mdLink;
						
						// Заменяем в редакторе
						editor.replaceRange(newMdLink, start, cursorPosition);
					}
					this.alias = "";
					this.enteringObserverPosition = {line:0, ch:0};
				}
			}
		});
	}

	onunload() {
		// Отписываемся от события при выгрузке плагина
		if (this.editorChangeEventRef) {
			this.app.workspace.off("editor-change", this.editorChangeEventRef);
			this.editorChangeEventRef = null;
		}
	}

	private insertInternalLinkWithAlias = (editor: Editor, view: MarkdownView) => {
		const selectedWord:string = editor.getSelection(); // получаем выделение
		const hasSelectedWord:boolean = selectedWord !== ""; // что-то выделено или нет 
		this.alias = selectedWord;
		// текст, помещаемый внутрь ссылки, если выделен
		const linkText:string = hasSelectedWord ? `|${selectedWord}` : "";
		// смещение курсора после оборачивания в ссылку
		const cursorOffset:number = hasSelectedWord ? 3 + selectedWord.length : 2;

		this.replaceSelectionAndMoveCursor(editor, linkText, cursorOffset);
	};

	private replaceSelectionAndMoveCursor = (editor: Editor, text: string, cursorOffset: number) => {
		editor.replaceSelection(`[[${text}]]`); // заменяет выделение (то есть оборачивает в ссылку)

		const cursorPosition = editor.getCursor(); // EditorPosition
		cursorPosition.ch -= cursorOffset; // перемещает курсор внтурь ссылки для ввода пути

		if (this.alias !== "") {
			this.hasEnteringLinkPath = true; // включаем режим перехвата ввода
			// позиция символов, за которыми следим
			this.enteringObserverPosition = {line: cursorPosition.line, ch: cursorPosition.ch - 2};
		}
		editor.setCursor(cursorPosition);
	};
}
