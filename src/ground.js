import Ui from 'kenga/utils';
import Label from 'kenga-labels/label';
import Grail from 'kenga-containers/holy-grail-pane';
import Box from 'kenga-containers/box-pane';
import Split from 'kenga-containers/split-pane';
import Flow from 'kenga-containers/flow-pane';
import Toolbar from 'kenga-containers/tool-bar';
import Scroll from 'kenga-containers/scroll-pane';
import Button from 'kenga-buttons/button';
import Grid from 'kenga-grid/grid';
import ColumnNode from 'kenga-grid/columns/column-node';
import Menu from 'kenga-menu/menu';
import MenuItem from 'kenga-menu/menu-item';
import MenuSeparator from 'kenga-menu/menu-separator';
import i18n from './i18n';

export default function Layout() {
    const ground = new Grail();
    {
        ground.focusable = true;
    }
    const tools = new Toolbar();
    const palette = new Box(Ui.Orientation.VERTICAL);
    const explorer = new Grid();
    const widgetColumn = new ColumnNode();
    const leftBox = new Box();
    const leftSizer = new Flow();
    const rightBox = new Box();
    const rightSizer = new Flow();
    const paletteExplorerSplit = new Split();
    const explorerMenu = new Menu();
    const propertiesBox = new Grail();
    const propertiesHeader = new Label(i18n['winnie.properties.header']);
    const properties = new Grid();
    const widgets = new Flow();
    {
        widgetColumn.field = 'name';
        widgetColumn.title = 'widget.name';
        widgetColumn.width = null;
        explorer.addColumnNode(widgetColumn);
        explorer.headerVisible = false;
        explorer.insertable = explorer.deletable = false;
        explorer.draggableRows = true;
        explorer.showHorizontalLines =
            explorer.showVerticalLines =
                explorer.showOddRowsInOtherColor = false;
        explorer.contextMenu = explorerMenu;
        paletteExplorerSplit.dividerSize /= 2;
        paletteExplorerSplit.width = 340;
        paletteExplorerSplit.orientation = Ui.Orientation.VERTICAL;
        paletteExplorerSplit.first = palette;
        paletteExplorerSplit.second = explorer;
    }

    const propNameColumn = new ColumnNode();
    const propValueColumn = new ColumnNode();
    {
        propertiesBox.width = 310;
        propNameColumn.title = i18n['winnie.prop.name'];
        propNameColumn.field = 'name';
        propNameColumn.readonly = true;
        propNameColumn.width = null;
        propValueColumn.title = i18n['winnie.prop.value'];
        propValueColumn.field = 'value';
        propValueColumn.width = null;
        properties.addColumnNode(propNameColumn);
        properties.addColumnNode(propValueColumn);
        properties.insertable = properties.deletable = false;
        properties.headerVisible = false;
        propertiesBox.header = propertiesHeader;
        propertiesBox.content = properties;
    }

    const view = new Scroll(widgets);
    {
        view.contextMenu = explorerMenu;

        leftBox.add(paletteExplorerSplit);
        leftBox.add(leftSizer);
        rightBox.add(rightSizer);
        rightBox.add(propertiesBox);

        ground.header = tools;
        ground.leftSide = leftBox;
        ground.content = view;
        ground.rightSide = rightBox;
    }

    const tTemplates = new Button();
    const templatesMenu = new Menu();
    const tOpen = new Button();
    const tSave = new Button();
    const tExport = new Button();
    const tCut = new Button();
    const tCopy = new Button();
    const tPaste = new Button();
    const tRemove = new Button();
    const tUndo = new Button();
    const tRedo = new Button();
    const tSettings = new Button();

    function withStyle(name) {
        const div = document.createElement('div');
        div.className = name;
        return div;
    }

    {
        tTemplates.icon = withStyle('winnie-icon-buffer');
        tTemplates.toolTipText = i18n['winnie.adopt.tooltip'];
        tOpen.icon = withStyle('winnie-icon-folder-open-empty');
        tOpen.toolTipText = i18n['winnie.open.tooltip'];
        tSave.icon = withStyle('winnie-icon-floppy');
        tSave.toolTipText = i18n['winnie.save.tooltip'];
        tExport.icon = withStyle('winnie-icon-export');
        tExport.toolTipText = i18n['winnie.export.tooltip'];
        tCut.icon = withStyle('winnie-icon-scissors');
        tCut.toolTipText = i18n['winnie.cut.tooltip'];
        tCopy.icon = withStyle('winnie-icon-docs');
        tCopy.toolTipText = i18n['winnie.copy.tooltip'];
        tPaste.icon = withStyle('winnie-icon-clipboard');
        tPaste.toolTipText = i18n['winnie.paste.tooltip'];
        tRemove.icon = withStyle('winnie-icon-trash');
        tRemove.toolTipText = i18n['winnie.remove.tooltip'];
        tSettings.icon = withStyle('winnie-icon-cogs');
        tSettings.toolTipText = i18n['winnie.settings.tooltip'];

        tUndo.icon = withStyle('winnie-icon-reply-1');
        tUndo.toolTipText = i18n['winnie.undo.tooltip'];
        tRedo.icon = withStyle('winnie-icon-forward-1');
        tRedo.toolTipText = i18n['winnie.redo.tooltip'];

        tools.add(tTemplates);
        tools.add(tOpen);
        tools.add(tSave);
        tools.add(tExport);
        tools.add(tCut);
        tools.add(tCopy);
        tools.add(tPaste);
        tools.add(tUndo);
        tools.add(tRedo);
        tools.add(tRemove);
        //tools.add(tSettings);
    }

    const miAdd = new MenuItem(i18n['winnie.add.name']);
    miAdd.subMenu = new Menu();
    const miToSurface = new MenuItem(i18n['winnie.to.surface.name']);
    const miCut = new MenuItem(i18n['winnie.cut.name']);
    const miCopy = new MenuItem(i18n['winnie.copy.name']);
    const miPaste = new MenuItem(i18n['winnie.paste.name']);
    const miUndo = new MenuItem(i18n['winnie.undo.name']);
    const miRedo = new MenuItem(i18n['winnie.redo.name']);
    const miRemove = new MenuItem(i18n['winnie.remove.name']);
    {
        miAdd.icon = withStyle('winnie-icon-space');
        miToSurface.icon = withStyle('winnie-icon-space');
        miCut.icon = withStyle('winnie-icon-scissors');
        miCopy.icon = withStyle('winnie-icon-docs');
        miPaste.icon = withStyle('winnie-icon-clipboard');
        miUndo.icon = withStyle('winnie-icon-reply-1');
        miRedo.icon = withStyle('winnie-icon-forward-1');
        miRemove.icon = withStyle('winnie-icon-trash');

        [
            miAdd,
            miToSurface,
            miCut,
            miCopy,
            miPaste,
            miUndo,
            miRedo,
            miRemove
        ].forEach((mi) => {
            mi.iconTextGap = null;
        });

        explorerMenu.add(miAdd);
        explorerMenu.add(new MenuSeparator());
        explorerMenu.add(miToSurface);
        explorerMenu.add(new MenuSeparator());
        explorerMenu.add(miCut);
        explorerMenu.add(miCopy);
        //explorerMenu.add(miPaste);
        explorerMenu.add(new MenuSeparator());
        explorerMenu.add(miUndo);
        explorerMenu.add(miRedo);
        explorerMenu.add(new MenuSeparator());
        explorerMenu.add(miRemove);
    }
    return {
        ground,
        tools,
        palette,
        widgetColumn,
        explorer,
        paletteExplorerSplit,
        leftBox,
        leftSizer,
        explorerMenu,
        propertiesBox,
        propertiesHeader,
        properties,
        rightBox,
        rightSizer,
        widgets,
        view,
        miAdd,
        miToSurface,
        miCut,
        miCopy,
        miPaste,
        miUndo,
        miRedo,
        miRemove,
        propNameColumn,
        propValueColumn,
        tOpen,
        tTemplates,
        templatesMenu,
        tSave,
        tExport,
        tCut,
        tCopy,
        tPaste,
        tUndo,
        tRedo,
        tRemove,
        tSettings
    };
}