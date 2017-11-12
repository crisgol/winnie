import Invoke from 'septima-utils/invoke';
import Logger from 'septima-utils/logger';
import Ui from 'kenga/utils';
import Bound from 'kenga/bound';
import Widget from 'kenga/widget';
import Container from 'kenga/container';
import KeyCodes from 'kenga/key-codes';
import Label from 'kenga-labels/label';
import CheckBox from 'kenga-buttons/check-box';
import RadioButton from 'kenga-buttons/radio-button';
import ImageParagraph from 'kenga-labels/image-paragraph';
import Box from 'kenga-containers/box-pane';
import Flow from 'kenga-containers/flow-pane';
import Scroll from 'kenga-containers/scroll-pane';
import Grid from 'kenga-containers/grid-pane';
import Anchors from 'kenga-containers/anchors-pane';
import TabbedPane from 'kenga-containers/tabbed-pane';
import CardPane from 'kenga-containers/card-pane';
import Menu from 'kenga-menu/menu';
import MenuItem from 'kenga-menu/menu-item';
import DataGrid from 'kenga-grid/grid';
import ColumnNode from 'kenga-grid/columns/column-node';
import TextNumberField from './text-number-field';
import ground from './ground';
import i18n from './i18n';
import Wrapper from './winnie-widget';
import WinnieProperty from './winnie-property';
import reWidth from './rewidth';
import propValueOnRender from './props-render';
import { winnieKeyDown } from './shortcuts';
import { startRectSelection, proceedRectSelection, endRectSelection } from './rect-selection';
import { resizeDecor, mouseDrag, sizeLocationSnapshot, startItemsMove, proceedItemsMove, endItemsMove } from './location-size';
import { generalHiddenProps, datagridColumnsHiddenProps, datagridHiddenProps, tabbedPaneHiddenProps, pathProps } from './props-hidden';
import { generate as generateCode } from './code';

export default class Winnie {
    constructor() {
        function explorerColumnRewidth() {
            // TODO: Ensure proper work with expanded explorer tree
            self.layout.widgetColumn.width = self.layout.explorer.width - self.layout.widgetColumn.column.padding;
        }
        const enabled = [];
        function checkEnabled() {
            Invoke.later(() => {
                enabled.forEach((item) => {
                    item();
                });
            });
            explorerColumnRewidth();
        }
        this.checkEnabled = checkEnabled;
        const self = this;
        this.settings = {
            grid: {x: 10, y: 10},
            undoDepth: 1024 * 1024
        };
        this.paletteDrag = null;
        this.widgets = new Map(); // name -> widget
        this.forest = []; // root widgets
        this.layout = ground();
        this.edits = [];
        this.editsCursor = 0;
        this.decors = [];
        this.layout.leftSizer.element.classList.add('p-winnie-left-sizer');
        this.layout.rightSizer.element.classList.add('p-winnie-right-sizer');
        this.layout.propertiesHeader.element.classList.add('p-winnie-properties-header');
        this.layout.palette.element.classList.add('p-winnie-palette');
        this.layout.explorer.element.classList.add('p-winnie-explorer');
        this.layout.ground.element.classList.add('p-winnie-ground');
        this.layout.view.element.classList.add('p-winnie-view');
        this.layout.widgets.element.classList.add('p-winnie-widgets');

        Ui.on(this.layout.ground.element, Ui.Events.KEYDOWN, (event) => {
            winnieKeyDown(self, event);
        });

        mouseDrag(this.layout.view.element, (event) => {
            return startRectSelection(self.layout.view.element, event);
        }, proceedRectSelection, (start, diff, event) => {
            endRectSelection(self, start, diff, event);
        });
        this.layout.explorer.data = this.forest;
        this.layout.explorer.parentField = 'parent';
        this.layout.explorer.childrenField = 'children';
        this.layout.explorer.onSelect = (evt) => {
            self.lastSelected = evt.item;
            checkEnabled();
        };
        this.layout.widgetColumn.onRender = (item, viewCell) => {
            viewCell.innerHTML = `${item.name} [${item.source.name}]`;
            viewCell.title = `'${item.source.name}' from '${item.source.from}'`;
            if (item.delegate.element === self.visualRootElement()) {
                viewCell.classList.add('p-winnie-visual-root');
            }
        };
        function isParent(parent, child) {
            while (child.parent && child.parent !== parent) {
                child = child.parent;
            }
            return !!child.parent;
        }

        function move(w, dest, addAt) {
            if (!dest ||
                    dest.delegate instanceof Container && w.delegate instanceof Widget ||
                    dest.delegate instanceof DataGrid && w.delegate instanceof ColumnNode ||
                    dest.delegate instanceof ColumnNode && w.delegate instanceof ColumnNode) {
                if (w !== dest) {
                    if (!dest || !isParent(w, dest)) {
                        const source = w.parent;
                        if (!dest || !dest.full || dest === source) {
                            const removeAt = source ? source.indexOf(w) : self.forest.indexOf(w);
                            if (source === dest && addAt > removeAt) {
                                addAt--;
                            }
                            if (source !== dest || removeAt !== addAt) {
                                const ur = {
                                    name: `Move widget '${w.name}' to container '${dest ? dest.name : '[forest]'}' at position ${addAt}`,
                                    redo: () => {
                                        if (source) {
                                            source.remove(removeAt);
                                        } else {
                                            self.forest.splice(removeAt, 1);
                                        }
                                        if (dest) {
                                            dest.add(w, addAt);
                                        } else {
                                            self.forest.splice(addAt, 0, w);
                                        }
                                        self.layout.explorer.removed(w);
                                        self.layout.explorer.added(w);
                                        self.layout.explorer.goTo(w, true);
                                        ur.undo = () => {
                                            if (dest) {
                                                dest.remove(addAt);
                                            } else {
                                                self.forest.splice(addAt, 1);
                                            }
                                            if (source) {
                                                source.add(w, removeAt);
                                            } else {
                                                self.forest.splice(removeAt, 0, w);
                                            }
                                            self.layout.explorer.removed(w);
                                            self.layout.explorer.added(w);
                                            self.layout.explorer.goTo(w, true);
                                        };
                                    }
                                };
                                self.edit(ur);
                                return true;
                            } else {
                                Logger.info(`Widget '${w.name}' is a child of '${dest ? dest.name : '[forest]'}' already at the same position.`);
                            }
                        } else {
                            Logger.info(`Can't add widget '${w.name}' to widget '${dest ? dest.name : '[forest]'}'. ${dest ? dest.name : '[forest]'}' is full and can't accept more children.`);
                        }
                    } else {
                        Logger.info(`Can't add widget '${w.name}' to widget '${dest ? dest.name : '[forest]'}'. Widget '${w.name}' is parent of '${dest ? dest.name : '[forest]'}'.`);
                    }
                } else {
                    Logger.info(`Can't add widget '${w.name}' to itself.'`);
                }
            } else {
                Logger.info(`Can't add '${w.name}' to '${dest.name}'. Widget '${dest.name}' should be a container and '${w.name}' should be a widget.`);
            }
            return false;
        }
        this.move = move;

        this.layout.explorer.onDropInto = (w, dest) => {
            (self.layout.explorer.isSelected(w) ?
                    self.layout.explorer.selected :
                    [w])
                    .forEach(m => move(m, dest, dest.count));
        };

        this.layout.explorer.onDropBefore = (w, before) => {
            const dest = before.parent;
            const addAt = dest ? dest.indexOf(before) : self.forest.indexOf(before);
            (self.layout.explorer.isSelected(w) ?
                    self.layout.explorer.selected :
                    [w])
                    .reverse()
                    .forEach(m => move(m, dest, addAt));
        };

        this.layout.explorer.onDropAfter = (w, after) => {
            const dest = after.parent;
            const addAt = dest ? dest.indexOf(after) : self.forest.indexOf(after);
            (self.layout.explorer.isSelected(w) ?
                    self.layout.explorer.selected :
                    [w])
                    .reverse()
                    .forEach(m => move(m, dest, addAt + 1));
        };


        reWidth(this.layout.paletteExplorerSplit, self.layout.leftSizer, this.layout.view, 1, explorerColumnRewidth);
        reWidth(this.layout.propertiesBox, self.layout.rightSizer, this.layout.view, -1, () => {
            self.layout.propNameColumn.width = (self.layout.propertiesBox.width - 30) / 2;
            self.layout.propValueColumn.width = (self.layout.propertiesBox.width - 30) / 2;
        });

        this.layout.propNameColumn.field = 'name';
        this.layout.propValueColumn.editor = new TextNumberField();
        this.layout.propValueColumn.field = 'value';
        this.layout.propNameColumn.onRender = (item, viewCell) => {
            viewCell.title = item.name;
            if (item.edited) {
                viewCell.classList.add('p-winnie-property-edited');
            }
        };
        this.layout.propValueColumn.onRender = propValueOnRender;
        enabled.push(() => {
            self.layout.miToSurface.enabled = self._lastSelected &&
                    !self._lastSelected.delegate.parent &&
                    self._lastSelected.delegate instanceof Container;
        });
        this.layout.miToSurface.onAction = () => {
            checkEnabled();
            self.acceptVisualRoot(self._lastSelected);
            self.centerSurface();
        };
        this.layout.tSave.onAction = () => {
            checkEnabled();
            self.save();
        };
        [this.layout.tCut, this.layout.miCut].forEach((w) => {
            enabled.push(() => {
                w.enabled = self.layout.explorer.selected.length > 0;
            });
            w.onAction = () => {
                checkEnabled();
                self.cut();
            };
        });
        [this.layout.tCopy, this.layout.miCopy].forEach((w) => {
            enabled.push(() => {
                w.enabled = self.layout.explorer.selected.length > 0;
            });
            w.onAction = () => {
                checkEnabled();
                self.copy();
            };
        });
        [this.layout.tPaste, this.layout.miPaste].forEach((w) => {
            w.onAction = () => {
                checkEnabled();
                self.paste();
            };
        });
        [this.layout.tUndo, this.layout.miUndo].forEach((w) => {
            enabled.push(() => {
                w.enabled = self.canUndo;
            });
            w.onAction = () => {
                checkEnabled();
                self.undo();
            };
        });
        [this.layout.tRedo, this.layout.miRedo].forEach((w) => {
            enabled.push(() => {
                w.enabled = self.canRedo;
            });
            w.onAction = () => {
                checkEnabled();
                self.redo();
            };
        });
        [this.layout.tRemove, this.layout.miRemove].forEach((w) => {
            enabled.push(() => {
                w.enabled = self.layout.explorer.selected.length > 0;
            });
            w.onAction = () => {
                checkEnabled();
                self.removeSelected();
            };
        });
        checkEnabled();
        this._palette = {};
    }

    clear() {
        this.editsCursor = 0;
        this.edits = [];
        this.layout.widgets.clear();
        this.widgets.clear();
        const removed = this.forest.splice(0, this.forest.length);
        this.layout.explorer.removed(removed);
        this.layout.properties.data = [];
    }

    addWidget(item) {
        const self = this;
        const wasSelected = this._lastSelected;
        const widgetNameBase = item.widget.name.substring(0, 1).toLowerCase() + item.widget.name.substring(1);
        let widgetName = widgetNameBase;
        let nameAttempt = 1;
        while (this.widgets.has(widgetName)) {
            widgetName = `${widgetNameBase}${nameAttempt++}`;
        }
        function produce(constr) {
            let instance;
            if (constr === Grid) {
                const input = prompt(i18n['winnie.grid.dimensions']);
                const matched = input.match(/(\d+),\s*(\d+)/);
                if (matched) {
                    instance = new Grid(+matched[1], +matched[2], 10, 10);
                } else {
                    throw `Provided text: '${input}' is not useful.`;
                }
            } else if (constr === Box) {
                instance = new constr(Ui.Orientation.HORIZONTAL, 10, 10);
            } else {
                instance = new constr();
                if (instance instanceof ImageParagraph ||
                        instance instanceof MenuItem ||
                        instance instanceof CheckBox ||
                        instance instanceof RadioButton) {
                    instance.text = widgetName;
                }
            }
            instance.onMouseEnter = () => {
                instance.element.classList.add('p-winnie-widget-hover');
            };
            instance.onMouseExit = () => {
                instance.element.classList.remove('p-winnie-widget-hover');
            };
            mouseDrag(instance.element, (event) => {
                if (instance.element === self.visualRootElement()) {
                    return startRectSelection(self.layout.view.element, event);
                } else {
                    return startItemsMove(self, instance);
                }
            }, (start, diff) => {
                if (instance.element === self.visualRootElement()) {
                    proceedRectSelection(start, diff);
                } else {
                    proceedItemsMove(self, start, diff);
                }
            }, (start, diff, event) => {
                if (instance.element === self.visualRootElement()) {
                    endRectSelection(self, start, diff, event);
                    const subject = instance['winnie.wrapper'];
                    self.layout.explorer.goTo(subject);
                } else {
                    if (diff.x !== 0 || diff.y !== 0) {
                        endItemsMove(self, start);
                    } else {
                        const subject = instance['winnie.wrapper'];
                        self.layout.explorer.goTo(subject);
                        if (event.ctrlKey) {
                            if (self.layout.explorer.isSelected(subject)) {
                                self.layout.explorer.unselect(subject);
                            } else {
                                self.layout.explorer.select(subject);
                            }
                        } else {
                            self.layout.explorer.unselectAll();
                            self.layout.explorer.select(subject);
                        }
                    }
                }
            });
            if (instance instanceof Container) {
                Ui.on(instance.element, Ui.Events.DRAGENTER, event => {
                    if (self.paletteDrag) {
                        event.preventDefault();
                        event.stopPropagation();
                        instance.element.classList.add('p-winnie-container-dnd-target');
                    }
                });
                Ui.on(instance.element, Ui.Events.DRAGLEAVE, event => {
                    if (self.paletteDrag) {
                        event.preventDefault();
                        event.stopPropagation();
                        instance.element.classList.remove('p-winnie-container-dnd-target');
                    }
                });
                Ui.on(instance.element, Ui.Events.DRAGOVER, event => {
                    if (self.paletteDrag) {
                        event.preventDefault();
                        event.stopPropagation();
                        event.dropEffect = 'move';
                    }
                });
                Ui.on(instance.element, Ui.Events.DROP, event => {
                    if (self.paletteDrag) {
                        event.preventDefault();
                        event.stopPropagation();
                        instance.element.classList.remove('p-winnie-container-dnd-target');
                        self.layout.explorer.goTo(instance['winnie.wrapper'], true);
                        const added = self.addWidget(self.paletteDrag.item);
                        if (instance instanceof Anchors) {
                            const wX = Ui.absoluteLeft(added.delegate.element);
                            const wY = Ui.absoluteTop(added.delegate.element);
                            const left = event.clientX - wX - added.delegate.width / 2;
                            const top = event.clientY - wY - added.delegate.height / 2;
                            added.delegate.left = left > 0 ? left : self.settings.grid.x;
                            added.delegate.top = top > 0 ? top : self.settings.grid.y;
                        }
                        self.stickDecors();
                    }
                });
            }
            return instance;
        }

        const created = new Wrapper(produce(item.widget), widgetName, item.defaultInstance, (newName) => {
            if (self.widgets.has(newName)) {
                alert(i18n['winnie.name.used']);
                self.layout.explorer.abortEditing();
                return created.name;
            } else if (newName.match(/^[a-zA-Z_][a-zA-Z_0-9]*$/)) {
                const oldName = created.name;
                self.edit({
                    name: `Rename widget '${oldName}' as '${newName}'`,
                    redo: () => {
                        self.widgets.delete(oldName);
                        created._name = newName;
                        self.widgets.set(newName, created);
                        self.layout.explorer.changed(created);
                        self.layout.explorer.goTo(created, true);
                    },
                    undo: () => {
                        self.widgets.delete(newName);
                        created._name = oldName;
                        self.widgets.set(oldName, created);
                        self.layout.explorer.changed(created);
                        self.layout.explorer.goTo(created, true);
                    }
                });
                self.checkEnabled();
                return newName;
            } else {
                alert(i18n['winnie.bad.name']);
                self.layout.explorer.abortEditing();
                return created.name;
            }
        });
        created.source = item;
        this.edit({
            name: `Add '${item.name}' widget from '${item.from}'`,
            redo: () => {
                self.widgets.set(widgetName, created);
                self.forest.push(created);
                self.layout.explorer.added(created);
                self.layout.explorer.goTo(created, true);
            },
            undo: () => {
                self.widgets.delete(widgetName);
                const createdIndex = self.forest.indexOf(created);
                const removed = self.forest.splice(createdIndex, 1);
                self.layout.explorer.unselect(created);
                self.layout.explorer.removed(created);
                self.revokeVisualRoot(created);
            }
        });
        if (created.delegate instanceof Container &&
                !created.parent &&
                !this.visualRootPresent()) {
            this.acceptVisualRoot(created);
            if (created.delegate instanceof Container) {
                created.delegate.width = created.delegate.height = 300;
            }
            this.centerSurface();
        }
        if (wasSelected) {
            if (wasSelected.delegate instanceof Container) {
                this.move(created, wasSelected, wasSelected.count);
                if (created.delegate instanceof Container) {
                    created.delegate.width = created.delegate.height = 100;
                }
            } else if (wasSelected.parent && wasSelected.parent.delegate instanceof Container) {
                this.move(created, wasSelected.parent, wasSelected.parent.count);
                if (created.delegate instanceof Container) {
                    created.delegate.width = created.delegate.height = 100;
                }
            }
        }
        this.checkEnabled();
        return created;
    }

    removeSelected() {
        const self = this;
        function added(item) {
            self.layout.explorer.unselectAll();
            self.layout.explorer.select(item);
            self.layout.explorer.added(item);
        }
        function removed(item) {
            self.layout.explorer.unselect(item);
            self.layout.explorer.removed(item);
            self.revokeVisualRoot(item);
        }
        const toRemove = this.layout.explorer.selected;
        const actions = toRemove.map((item) => {
            const itemParent = item.parent;
            const ur = {};
            ur.redo = () => {
                const removedAt = itemParent ? itemParent.indexOf(item) : self.forest.indexOf(item);
                if (itemParent) {
                    itemParent.remove(removedAt);
                } else {
                    self.forest.splice(removedAt, 1);
                }
                self.widgets.delete(item.name);
                removed(item);
                ur.undo = () => {
                    self.widgets.set(item.name, item);
                    if (itemParent) {
                        itemParent.add(item, removedAt);
                        added(item);
                    } else {
                        self.forest.splice(removedAt, 0, item);
                        added(item);
                    }
                };
            };
            return ur;
        });
        this.edit({
            name: `Delete ${toRemove.length > 1 ? `selected (${toRemove.length}) widgets` : `'${toRemove[0].name}' widget`}`,
            redo: () => {
                actions.forEach((item) => {
                    item.redo();
                });
            },
            undo: () => {
                actions.reverse().forEach((item) => {
                    item.undo();
                });
            }
        });
        this.checkEnabled();
    }

    copy() {
    }

    paste() {
    }

    cut() {
        if (this.layout.explorer.selected.length > 0) {
            this.copy();
            this.removeSelected();
        }
    }

    save() {
        if (this.widgets.size > 0) {
            const code = generateCode(this);
            try {
                const input = document.createElement('textarea');
                input.style.left = input.style.top = '0px';
                input.style.width = input.style.height = '2em';
                input.style.background = 'transparent';
                input.style.padding = 0;
                input.style.border = 'none';
                input.style.outline = 'none';
                input.style.boxShadow = 'none';

                input.value = code;
                document.body.appendChild(input);
                try {
                    input.select();
                    document.execCommand('copy');
                } finally {
                    document.body.removeChild(input);
                }
                Logger.info('Generated code copied to the clipboard.');
                alert(i18n['winnie.generated.copied']);
            } catch (e) {
                Logger.severe(`Failed to copy code to clipboard due to an error:`);
                Logger.severe(e);
                Logger.info(`Generated code is:\n${code}`);
            }
        } else {
            Logger.info(`Can't generate code for an empty [forest].`);
        }
    }

    get canRedo() {
        return this.editsCursor >= 0 && this.editsCursor < this.edits.length;
    }

    redo() {
        if (this.canRedo) {
            const item = this.edits[this.editsCursor];
            item.redo();
            this.editsCursor++;
            Logger.info(`Redone edit: ${item.name}.`);
            this.checkEnabled();
        }
    }

    get canUndo() {
        return this.editsCursor > 0 && this.editsCursor <= this.edits.length;
    }

    undo() {
        if (this.canUndo) {
            --this.editsCursor;
            const item = this.edits[this.editsCursor];
            item.undo();
            Logger.info(`Undone edit: ${item.name}.`);
            this.checkEnabled();
        }
    }

    edit(body) {
        body.redo();
        const dropped = this.edits.splice(this.editsCursor, this.edits.length - this.editsCursor, body);
        Logger.info(`Recorded edit: ${body.name}.`);
        if (dropped.length > 0) {
            Logger.info(`Dropped ${dropped.length} tail edits.`);
        }
        this.editsCursor++;
        while (this.edits.length > this.settings.undoDepth) {
            const shifted = this.edits.shift();
            this.editsCursor--;
            Logger.info(`Dropped head edit: '${shifted.name}'.`);
        }
    }

    get palette() {
        const self = this;
        function category(name) {
            const box = new Box(Ui.Orientation.VERTICAL);
            const header = new Label(name);
            const headerIcon = document.createElement('div');
            headerIcon.className = 'icon-down-open';
            header.icon = headerIcon;
            header.element.classList.add('p-widget-category-header');
            const content = new Flow(5, 5);
            content.element.classList.add('p-widget-category-content');
            box.add(header);
            box.add(content);
            self.layout.palette.add(box);
            header.onMouseClick = (evt) => {
                if (headerIcon.classList.contains('icon-down-open')) {
                    headerIcon.classList.remove('icon-down-open');
                    headerIcon.classList.add('icon-right-open');
                    content.height = 0;
                } else {
                    headerIcon.classList.remove('icon-right-open');
                    headerIcon.classList.add('icon-down-open');
                    content.height = null;
                }
            };
            const menuItem = new MenuItem(name);
            const menuIcon = document.createElement('div');
            menuIcon.className = 'icon-space';
            menuItem.icon = menuIcon;
            menuItem.subMenu = new Menu();
            self.layout.miAdd.subMenu.add(menuItem);
            return {
                name,
                palette: {box, header, content},
                menu: menuItem.subMenu,
                items: []
            };
        }
        function categoryOf(item) {
            let categoryName;
            if (item.category) {
                categoryName = item.category;
            } else {
                categoryName = i18n['winnie.category.default'];
                Logger.info(`Palette item from '${item.from}' hs no category, so it goers to default one.`);
            }
            return categoryName in self._palette ? self._palette[categoryName] : self._palette[categoryName] = category(categoryName);
        }
        function paletteItemOf(item) {
            const itemLabel = new Label(item.name);
            itemLabel.horizontalTextPosition = Ui.HorizontalPosition.CENTER;
            itemLabel.verticalTextPosition = Ui.VerticalPosition.BOTTOM;
            const div = document.createElement('div');
            div.className = item.iconStyle ? item.iconStyle : 'icon-wrench';
            itemLabel.icon = div;
            itemLabel.opaque = true;
            itemLabel.element.classList.add('p-widget-palette-item');
            // TODO: remove after kenga update
            itemLabel.background = '#e9ebee';
            //
            if ('description' in item) {
                itemLabel.toolTipText = item.description;
            }
            itemLabel.element.draggable = true;
            Ui.on(itemLabel.element, Ui.Events.DRAGSTART, event => {
                event.stopPropagation();
                self.paletteDrag = {
                    item
                };
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', 'p-winnie-palette-item');
            });
            Ui.on(itemLabel.element, Ui.Events.DRAGEND, event => {
                event.stopPropagation();
                if (self.paletteDrag) {
                    self.paletteDrag = null;
                }
            });
            return itemLabel;
        }
        function menuItemOf(item) {
            const itemMi = new MenuItem(item.name);
            const div = document.createElement('div');
            div.className = item.iconStyle ? item.iconStyle : 'icon-wrench';
            itemMi.icon = div;
            return itemMi;
        }
        return {
            add: (items) => {
                if (!Array.isArray(items))
                    items = [items];
                items.filter((item) => {
                    if (!item.name) {
                        Logger.info(`Can't add anonymous palette item from '${item.from}'. Skipping...`);
                        return false;
                    } else if (!item.from) {
                        Logger.info(`Can't add palette item '${item.name}' without 'from' field. Skipping...`);
                        return false;
                    } else if (!item.widget) {
                        Logger.info(`Can't add palette item '${item.name}' without 'widget' field. Skipping...`);
                        return false;
                    } else {
                        return true;
                    }
                }).forEach((item) => {
                    try {
                        const paletteItem = paletteItemOf(item);
                        const itemMi = menuItemOf(item);
                        item.defaultInstance = new item.widget();
                        itemMi.onAction = () => {
                            self.addWidget(item);
                        };
                        const category = categoryOf(item);
                        category.items.push({
                            palette: paletteItem,
                            mi: itemMi,
                            widget: item.widget,
                            from: item.from,
                            name: item.name,
                            defaultInstance: item.defaultInstance,
                            description: item.description,
                            style: item.style,
                            category,
                        });
                        category.palette.content.add(paletteItem);
                        category.menu.add(itemMi);
                    } catch (ex) {
                        Logger.info(`Can't add palette item '${item.name}' from '${item.from}' due to exception:`);
                        Logger.severe(ex);
                        Logger.info(`Palette item '${item.name}' from '${item.from}' skipped.`);
                    }
                });
            }
        };
    }

    get lastSelected() {
        return this._lastSelected;
    }

    set lastSelected(item) {
        const self = this;
        this.widgets.forEach((item, name) => {
            item.delegate.element.classList.remove('p-winnie-widget-selected');
        });

        this.layout.explorer.selected.forEach((selectedItem) => {
            selectedItem.delegate.element.classList.add('p-winnie-widget-selected');
        });

        self.undecorate();
        if (this._lastSelected !== item) {
            if (this._lastSelected) {
                this.layout.properties.data = [];
                self.checkEnabled();
            }
            this._lastSelected = item;
            if (this._lastSelected) {
                let sheet;
                if (item.sheet) {
                    sheet = item.sheet;
                } else {
                    const propNames = Object.getOwnPropertyNames(item.delegate);
                    propNames.push(...pathProps);
                    sheet = item.sheet = propNames
                            .filter(key =>
                                typeof item.delegate[key] !== 'function' &&
                                        !generalHiddenProps.has(key) &&
                                        (!(item.delegate instanceof DataGrid) || !datagridHiddenProps.has(key)) &&
                                        (!(item.delegate instanceof ColumnNode) || !datagridColumnsHiddenProps.has(key)) &&
                                        (!(item.delegate instanceof TabbedPane) || !tabbedPaneHiddenProps.has(key)) &&
                                        (!(item.delegate instanceof CardPane) || !tabbedPaneHiddenProps.has(key)) &&
                                        !generalHiddenProps.has(key) &&
                                        !key.startsWith('on')
                            )
                            .map((key) => {
                                const prop = new WinnieProperty(item.delegate, key, newValue => {
                                    const editBody = {
                                        name: `Property '${key}' of widget '${item.name}' change`,
                                        redo: () => {
                                            const oldValue = key.includes('.') ? Bound.getPathData(item.delegate, key) : item.delegate[key];
                                            if (key.includes('.')) {
                                                Bound.setPathData(item.delegate, key, newValue);
                                            } else {
                                                item.delegate[key] = newValue;
                                            }
                                            if (!prop.silent) {
                                                self.layout.properties.changed(prop);
                                                self.layout.properties.goTo(prop, true);
                                            }
                                            prop.silent = false;
                                            self.stickDecors();
                                            editBody.undo = () => {
                                                if (key.includes('.')) {
                                                    Bound.setPathData(item.delegate, key, oldValue);
                                                } else {
                                                    item.delegate[key] = oldValue;
                                                }
                                                self.layout.properties.changed(prop);
                                                self.layout.properties.goTo(prop, true);
                                                self.stickDecors();
                                            };
                                        }
                                    };
                                    self.edit(editBody);
                                    self.checkEnabled();
                                }, key.includes('.') ? Bound.getPathData(item.defaultInstance, key) : item.defaultInstance[key]);
                                return prop;
                            });
                }
                this.layout.properties.data = sheet
                        .filter(p => !p.name.startsWith('tab.') || item.delegate.parent instanceof TabbedPane);
                self.checkEnabled();
            }
        }
        self.decorate();
    }

    decorate() {
        if (this._lastSelected && this.layout.explorer.selected.length === 1) {
            const self = this;
            const subject = self._lastSelected;
            self.decors = (() => {
                if (subject.delegate.attached) {
                    const decors = resizeDecor(self.layout.widgets, subject.delegate, (prevState, diff) => {
                        const subjectElement = subject.delegate.element;
                        if (diff.x !== 0 || diff.y !== 0) {
                            const newState = {anchors: {
                                    left: subjectElement.style.left,
                                    width: subjectElement.style.width,
                                    right: subjectElement.style.right,
                                    top: subjectElement.style.top,
                                    height: subjectElement.style.height,
                                    bottom: subjectElement.style.bottom
                                }};
                            self.edit({
                                name: `Widget '${subject.name}' resize`,
                                redo: () => {
                                    subjectElement.style.left = newState.anchors.left;
                                    subjectElement.style.width = newState.anchors.width;
                                    subjectElement.style.right = newState.anchors.right;
                                    subjectElement.style.top = newState.anchors.top;
                                    subjectElement.style.height = newState.anchors.height;
                                    subjectElement.style.bottom = newState.anchors.bottom;
                                    self.stickDecors();
                                    self.layout.explorer.goTo(subject, true);
                                },
                                undo: () => {
                                    subjectElement.style.left = prevState.anchors.left;
                                    subjectElement.style.width = prevState.anchors.width;
                                    subjectElement.style.right = prevState.anchors.right;
                                    subjectElement.style.top = prevState.anchors.top;
                                    subjectElement.style.height = prevState.anchors.height;
                                    subjectElement.style.bottom = prevState.anchors.bottom;
                                    self.stickDecors();
                                    self.layout.explorer.goTo(subject, true);
                                },
                            });
                        }
                    });
                    if (subject.delegate.parent instanceof Anchors) {
                        return [decors.lt, decors.lm, decors.lb, decors.mt, decors.mb, decors.rt, decors.rm, decors.rb];
                    } else if (subject.delegate.parent instanceof Flow || subject.delegate.parent instanceof Scroll) {
                        return [decors.mb, decors.rm, decors.rb];
                    } else if (subject.delegate.parent instanceof Box && subject.delegate.parent.orientation === Ui.Orientation.VERTICAL) {
                        return [decors.mb];
                    } else if (subject.delegate.parent instanceof Box && subject.delegate.parent.orientation === Ui.Orientation.VERTICAL) {
                        return [decors.mb];
                    } else {
                        return [];
                    }
                } else {
                    return [];
                }
            })()
                    .map((d, i, source) => {
                        self.layout.widgets.element.appendChild(d);
                        d.neightbours = source;
                        d.stick();
                        return d;
                    });
        }
    }

    undecorate() {
        const self = this;
        self.decors.forEach(d => {
            if (d.parentElement) {
                d.parentElement.removeChild(d);
            }
        });
    }

    visualRootElement() {
        let child = this.layout.widgets.element.firstElementChild;
        while (child) {
            if (child.tagName.toLowerCase() !== 'style' && !child.className.includes('p-winnie-decoration')) {
                return child;
            }
            child = child.nextElementSibling;
        }
        return null;
    }

    visualRootPresent() {
        return !!this.visualRootElement();
    }

    acceptVisualRoot(w) {
        const oldVRE = this.visualRootElement();
        if (oldVRE !== w.delegate.element) {
            if (oldVRE) {
                this.layout.widgets.element.removeChild(oldVRE);
            }
            this.layout.widgets.element.appendChild(w.delegate.element);
        }
    }

    revokeVisualRoot(w) {
        if (w.delegate.element.parentElement === this.layout.widgets.element) {
            this.layout.widgets.element.removeChild(w.delegate.element);
        }
    }

    centerSurface() {
        this.layout.view.element.scrollLeft = (this.layout.widgets.element.offsetWidth - this.layout.view.element.clientWidth) / 2;
        this.layout.view.element.scrollTop = (this.layout.widgets.element.offsetHeight - this.layout.view.element.clientHeight) / 2;
    }

    stickDecors() {
        this.decors.forEach((d) => {
            d.stick();
        });
    }
}
