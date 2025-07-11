import { Editor, MarkdownView, Plugin } from "obsidian";

export default class BetterLinkInserterPlugin extends Plugin {
	async onload() {
		this.addCommand({
			id: "use-selected-word-as-alias",
			name: "Insert an internal link (using selected word as alias if possible)",
			editorCallback: this.insertInternalLinkWithAlias,
		});
	}

	onunload() {}

	private insertInternalLinkWithAlias = (editor: Editor, view: MarkdownView) => {
		const selectedWord = editor.getSelection();
		const hasSelectedWord = selectedWord !== "";

		const linkText = hasSelectedWord ? `|${selectedWord}` : "";
		const cursorOffset = hasSelectedWord ? 3 + selectedWord.length : 2;

		// Вставляем вики-ссылку
		this.replaceSelectionAndMoveCursor(editor, `[[${linkText}]]`, cursorOffset);

		// Запоминаем позицию вставленной ссылки
		const from = editor.getCursor("from");
		const to = editor.getCursor("to");
		const linkStart = { ...from, ch: from.ch - (hasSelectedWord ? 4 + selectedWord.length : 3) };
		const linkEnd = { ...from };

		// Обработчик перемещения курсора
		const onCursorActivity = () => {
			const pos = editor.getCursor();
			// Если курсор вне диапазона вставленной ссылки
			if (
				pos.line !== linkStart.line ||
				pos.ch < linkStart.ch ||
				pos.ch > linkEnd.ch
			) {
				// Получаем текст ссылки
				const linkText = editor.getRange(linkStart, linkEnd);
				// Парсим [[note|alias]]
				const match = linkText.match(/\[\[([^\|\]]+)\|?([^\]]*)\]\]/);
				if (match) {
					const note = match[1];
					const alias = match[2] || note;
					const mdLink = `[${alias}](${note})`;
					editor.replaceRange(mdLink, linkStart, linkEnd);
				}
				// Снимаем обработчик
				(editor as any).off("cursorActivity", onCursorActivity);
			}
		};

		// Вешаем обработчик
		(editor as any).on("cursorActivity", onCursorActivity);
	};

	private replaceSelectionAndMoveCursor = (editor: Editor, text: string, cursorOffset: number) => {
		editor.replaceSelection(text);

		const cursorPosition = editor.getCursor();
		cursorPosition.ch -= cursorOffset;

		editor.setCursor(cursorPosition);
	};
}
