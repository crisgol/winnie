import Ui from 'kenga/utils';
import KeyCodes from 'kenga/key-codes';

const NULL_COLOR = '#e9ebee';

function onRender(item, viewCell) {
    if (item.name === 'background' || item.name === 'foreground') {
        viewCell.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'color';
        if (item.value) {
            input.value = item.value + '';
        } else {
            input.value = NULL_COLOR;
        }
        const colorChanged = event => {
            item.silent = true;
            item.value = input.value;
        };
        let changeReg = Ui.on(input, Ui.Events.CHANGE, colorChanged);
        let inputReg = Ui.on(input, Ui.Events.INPUT, colorChanged);
        Ui.on(input, Ui.Events.KEYDOWN, event => {
            if (event.keyCode === KeyCodes.KEY_BACKSPACE ||
                    event.keyCode === KeyCodes.KEY_DELETE) {
                item.silent = true;
                item.value = null;
                changeReg.removeHandler();
                inputReg.removeHandler();
                try {
                    input.value = NULL_COLOR;
                } finally {
                    changeReg = Ui.on(input, Ui.Events.CHANGE, colorChanged);
                    inputReg = Ui.on(input, Ui.Events.INPUT, colorChanged);
                }
            }
        });
        viewCell.appendChild(input);
        viewCell.firstElementChild.classList.add('p-grid-cell-editor');
        Ui.on(viewCell.firstElementChild, Ui.Events.CLICK, event => {
            event.stopPropagation();
        });
    } else if (typeof item.value === 'number') {
        viewCell.innerHTML = '';
        const input = document.createElement('input');
        input.type = 'number';
        if (item.value !== null && item.value !== undefined && !isNaN(item.value)) {
            input.value = item.value;
        }
        input.step =
                item.name === 'left' ||
                item.name === 'top' ||
                item.name === 'width' ||
                item.name === 'height'
                ? '0.01' : '1';
        Ui.on(input, Ui.Events.CHANGE, event => {
            item.silent = true;
            const parsed = parseFloat(input.value);
            if (isNaN(parsed)) {
                item.value = null;
            } else {
                item.value = parsed;
            }
        });
        viewCell.appendChild(input);
        viewCell.firstElementChild.classList.add('p-grid-cell-editor');
        Ui.on(viewCell.firstElementChild, Ui.Events.CLICK, event => {
            event.stopPropagation();
        });
    }
}
;

export default onRender;