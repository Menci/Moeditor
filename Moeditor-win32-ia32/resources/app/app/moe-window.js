/*
 *  This file is part of Moeditor.
 *
 *  Copyright (c) 2016 Menci <huanghaorui301@gmail.com>
 *
 *  Moeditor is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  Moeditor is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with Moeditor. If not, see <http://www.gnu.org/licenses/>.
 */

'use strict';

const BrowserWindow = require('electron').BrowserWindow,
      dialog = require('electron').dialog,
      MoeditorAction = require('./moe-action');

class MoeditorWindow {
	constructor(fileName) {
        this.fileName = fileName;
        this.content = '';
        this.changed = false;
		this.window = new BrowserWindow({
            autoHideMenuBar: true,
            width: 900 * Config.get('scale-factor'),
            height: 600 * Config.get('scale-factor'),
            webPreferences: {
                zoomFactor: Config.get('scale-factor')
            },
            frame: false,
			show: false
        });
        this.window.moeditorWindow = this;
        this.window.moeditorApplication = moeApp;

        this.registerEvents();
        this.window.loadURL('file://' + Const.path + '/browser/index.html');

        if (Flag.debug | Config.get('debug')) {
            this.window.webContents.openDevTools();
        }
	}

    registerEvents() {
        this.window.on('close', function(e) {
            if (this.moeditorWindow.changed) {
                const choice = dialog.showMessageBox(
                    this,
                    {
                        type: 'question',
                        buttons: ['Yes', 'No', 'Cancel'],
                        title: 'Confirm',
                        message: 'Save changes to file?'
                    }
                );

                if (choice == 0) {
                    if (!MoeditorAction.save(this)) e.preventDefault();
                } else if (choice == 2) e.preventDefault();
            }
        });
    }
}

module.exports = MoeditorWindow;
