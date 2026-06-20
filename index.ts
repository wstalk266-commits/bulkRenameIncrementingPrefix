import joplin from 'api';
import { MenuItemLocation } from 'api/types';

async function renumberNotebook(notebookId: string) {
    const settings = {
        start: await joplin.settings.value('startNumber'),
        digits: await joplin.settings.value('digits'),
        separator: await joplin.settings.value('separator'),
        ascending: await joplin.settings.value('ascending'),
    };

    let page = 1;
    let notes: any[] = [];

    while (true) {
        const result = await joplin.data.get([
            'folders',
            notebookId,
            'notes',
        ], {
            fields: ['id', 'title', 'updated_time'],
            limit: 100,
            page,
        });

        notes.push(...result.items);

        if (!result.has_more) break;
        page++;
    }

    notes.sort((a, b) => {
        return settings.ascending
            ? a.updated_time - b.updated_time
            : b.updated_time - a.updated_time;
    });

    let counter = settings.start;

    for (const note of notes) {
        const cleanTitle = note.title.replace(
            /^\d+\s*[-_.]?\s*/,
            ''
        );

        const prefix = String(counter).padStart(
            settings.digits,
            '0'
        );

		const newTitle = `${prefix} ${cleanTitle}`;

        if (newTitle !== note.title) {
            await joplin.data.put(
                ['notes', note.id],
                null,
                { title: newTitle }
            );
        }

        counter++;
    }
}

joplin.plugins.register({
    onStart: async function() {

        await joplin.settings.registerSection(
            'obsidianOrder',
            {
                label: 'Obsidian Order',
                iconName: 'fas fa-sort-numeric-down',
            }
        );

        await joplin.settings.registerSettings({
            startNumber: {
                value: 1,
                type: 2,
                section: 'obsidianOrder',
                public: true,
                label: 'Starting Number',
            },
            digits: {
                value: 4,
                type: 2,
                section: 'obsidianOrder',
                public: true,
                label: 'Number Padding',
            },
            separator: {
                value: ' ',
                type: 1,
                section: 'obsidianOrder',
                public: true,
                label: 'Separator',
            },
            ascending: {
                value: true,
                type: 3,
                section: 'obsidianOrder',
                public: true,
                label: 'Oldest Modified First',
            },
        });

        await joplin.commands.register({
            name: 'renumberNotebook',
            label: 'Renumber Notes By Modified Date',
            execute: async () => {
                const folder =
                    await joplin.workspace.selectedFolder();

                if (!folder) {
                    await joplin.views.dialogs.showMessageBox(
                        'Please select a notebook first.'
                    );
                    return;
                }

                await renumberNotebook(folder.id);

                await joplin.views.dialogs.showMessageBox(
                    'Notes renumbered successfully.'
                );
            },
        });

        await joplin.views.menuItems.create(
            'renumberNotebookMenu',
            'renumberNotebook',
            MenuItemLocation.FolderContextMenu
        );
    },
});