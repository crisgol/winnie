import Ui from 'kenga/utils';
import Anchors from 'kenga-containers/anchors-pane';

function leftInSpaceOf(elem, parent) {
    let left = 0;
    let curr = elem.offsetParent;
    // This intentionally excludes body which has a null offsetParent.
    while (curr && curr !== parent && curr.offsetParent) {
        left -= curr.scrollLeft;
        curr = curr.parentNode;
    }
    while (elem && elem !== parent) {
        left += elem.offsetLeft;
        elem = elem.offsetParent;
    }
    return left;
}

function topInSpaceOf(elem, parent) {
    let top = 0;
    let curr = elem.offsetParent;
    // This intentionally excludes body which has a null offsetParent.
    while (curr && curr !== parent && curr.offsetParent) {
        top -= curr.scrollTop;
        curr = curr.parentNode;
    }
    while (elem && elem !== parent) {
        top += elem.offsetTop;
        elem = elem.offsetParent;
    }
    return top;
}

function mouseDrag(resizer, onBegin, onChange, onEnd) {
    let mouseDownAt = null;
    let prevState = null;
    let onMouseUp = null;
    let onMouseMove = null;
    const onDragStart = Ui.on(resizer, Ui.Events.DRAGSTART, event => {
        if (event.button === 0) {
            event.preventDefault();
            event.stopPropagation();
        }
    });
    const onMouseDown = Ui.on(resizer, Ui.Events.MOUSEDOWN, event => {
        if (event.button === 0) {
            event.stopPropagation();
            mouseDownAt = {x: event.clientX, y: event.clientY};
            prevState = onBegin(event);
            if (!onMouseUp) {
                onMouseUp = Ui.on(document, Ui.Events.MOUSEUP, event => {
                    event.stopPropagation();
                    if (onMouseUp) {
                        onMouseUp.removeHandler();
                        onMouseUp = null;
                    }
                    if (onMouseMove) {
                        onMouseMove.removeHandler();
                        onMouseMove = null;
                    }
                    const mouseDiff = {x: event.clientX - mouseDownAt.x, y: event.clientY - mouseDownAt.y};
                    onEnd(prevState, mouseDiff, event);
                });
            }
            if (!onMouseMove) {
                onMouseMove = Ui.on(document, Ui.Events.MOUSEMOVE, event => {
                    event.stopPropagation();
                    event.preventDefault();
                    const mouseDiff = {x: event.clientX - mouseDownAt.x, y: event.clientY - mouseDownAt.y};
                    onChange(prevState, mouseDiff, event);
                });
            }
        }
    });
    return {
        removeHandler: () => {
            onDragStart.removeHandler();
            onMouseDown.removeHandler();
        }
    };
}

function sizeLocationSnapshot(subject) {
    return {
        left: subject.left,
        top: subject.top,
        width: subject.width,
        height: subject.height,
        anchors: {
            left: subject.element.style.left,
            width: subject.element.style.width,
            right: subject.element.style.right,
            top: subject.element.style.top,
            height: subject.element.style.height,
            bottom: subject.element.style.bottom
        }
    };
}

function applySizeLocationSnapshot(snapshot, subject) {
    subject.element.style.left = snapshot.anchors.left;
    subject.element.style.width = snapshot.anchors.width;
    subject.element.style.right = snapshot.anchors.right;
    subject.element.style.top = snapshot.anchors.top;
    subject.element.style.height = snapshot.anchors.height;
    subject.element.style.bottom = snapshot.anchors.bottom;
}

function resizeDecor(surface, subject, onEnd) {
    return {
        lt: (() => {
            const lt = document.createElement('div');
            lt.className = 'p-winnie-decoration p-winnie-decoration-left-top';
            mouseDrag(lt, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.left = prevState.left + diff.x;
                subject.top = prevState.top + diff.y;
                subject.width = prevState.width - diff.x;
                subject.height = prevState.height - diff.y;
                lt.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            lt.stick = () => {
                lt.style.left = `${leftInSpaceOf(subject.element, surface.element)}px`;
                lt.style.top = `${topInSpaceOf(subject.element, surface.element)}px`;
                lt.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return lt;
        })(),
        lm: (() => {
            const lm = document.createElement('div');
            lm.className = 'p-winnie-decoration p-winnie-decoration-left-middle';
            mouseDrag(lm, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.left = prevState.left + diff.x;
                subject.width = prevState.width - diff.x;
                lm.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            lm.stick = () => {
                lm.style.left = `${leftInSpaceOf(subject.element, surface.element)}px`;
                lm.style.top = `${topInSpaceOf(subject.element, surface.element) + subject.element.offsetHeight / 2}px`;
                lm.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return lm;
        })(),
        lb: (() => {
            const lb = document.createElement('div');
            lb.className = 'p-winnie-decoration p-winnie-decoration-left-bottom';
            mouseDrag(lb, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.left = prevState.left + diff.x;
                subject.width = prevState.width - diff.x;
                subject.height = prevState.height + diff.y;
                lb.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            lb.stick = () => {
                lb.style.left = `${leftInSpaceOf(subject.element, surface.element)}px`;
                lb.style.top = `${topInSpaceOf(subject.element, surface.element) + subject.element.offsetHeight}px`;
                lb.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return lb;
        })(),
        mt: (() => {
            const mt = document.createElement('div');
            mt.className = 'p-winnie-decoration p-winnie-decoration-middle-top';
            mouseDrag(mt, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.top = prevState.top + diff.y;
                subject.height = prevState.height - diff.y;
                mt.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            mt.stick = () => {
                mt.style.left = `${leftInSpaceOf(subject.element, surface.element) + subject.element.offsetWidth / 2}px`;
                mt.style.top = `${topInSpaceOf(subject.element, surface.element)}px`;
                mt.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return mt;
        })(),
        mb: (() => {
            const mb = document.createElement('div');
            mb.className = 'p-winnie-decoration p-winnie-decoration-middle-bottom';
            mouseDrag(mb, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.height = prevState.height + diff.y;
                mb.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            mb.stick = () => {
                mb.style.left = `${leftInSpaceOf(subject.element, surface.element) + subject.element.offsetWidth / 2}px`;
                mb.style.top = `${topInSpaceOf(subject.element, surface.element) + subject.element.offsetHeight}px`;
                mb.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return mb;
        })(),
        rt: (() => {
            const rt = document.createElement('div');
            rt.className = 'p-winnie-decoration p-winnie-decoration-right-top';
            mouseDrag(rt, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.top = prevState.top + diff.y;
                subject.width = prevState.width + diff.x;
                subject.height = prevState.height - diff.y;
                rt.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            rt.stick = () => {
                rt.style.left = `${leftInSpaceOf(subject.element, surface.element) + subject.element.offsetWidth}px`;
                rt.style.top = `${topInSpaceOf(subject.element, surface.element)}px`;
                rt.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return rt;
        })(),
        rm: (() => {
            const rm = document.createElement('div');
            rm.className = 'p-winnie-decoration p-winnie-decoration-right-middle';
            mouseDrag(rm, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.width = prevState.width + diff.x;
                rm.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            rm.stick = () => {
                rm.style.left = `${leftInSpaceOf(subject.element, surface.element) + subject.element.offsetWidth}px`;
                rm.style.top = `${topInSpaceOf(subject.element, surface.element) + subject.element.offsetHeight / 2}px`;
                rm.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return rm;
        })(),
        rb: (() => {
            const rb = document.createElement('div');
            rb.className = 'p-winnie-decoration p-winnie-decoration-right-bottom';
            mouseDrag(rb, () => {
                return sizeLocationSnapshot(subject);
            }, (prevState, diff) => {
                subject.width = prevState.width + diff.x;
                subject.height = prevState.height + diff.y;
                rb.neightbours.forEach((d) => {
                    d.stick();
                });
            }, onEnd);
            rb.stick = () => {
                rb.style.left = `${leftInSpaceOf(subject.element, surface.element) + subject.element.offsetWidth}px`;
                rb.style.top = `${topInSpaceOf(subject.element, surface.element) + subject.element.offsetHeight}px`;
                rb.style.display = subject.element.offsetParent != null ? '' : 'none';
            };
            return rb;
        })()
    };
}

function startItemsMove(model, pickedWidget) {
    const pickedItem = pickedWidget['winnie.wrapper'];
    return (() => {
        return model.layout.explorer.isSelected(pickedItem) ?
            model.layout.explorer.selected :
            [pickedItem];
    })()
        .filter((item) => item.delegate.attached && item.delegate.parent instanceof Anchors)
        .map((item) => {
            return {
                item,
                startSnapshot: sizeLocationSnapshot(item.delegate)
            };
        });
}

function proceedItemsMove(model, items, diff, snap) {
    function snapX(v) {
        return snap ?
            Math.round(v / model.settings.grid.x) * model.settings.grid.x :
            v;
    }

    function snapY(v) {
        return snap ?
            Math.round(v / model.settings.grid.y) * model.settings.grid.y :
            v;
    }

    items.forEach((moved) => {
        if (diff.x !== 0) {
            const left = moved.startSnapshot.left + diff.x;
            moved.item.delegate.left = snapX(left);
        }
        if (diff.y !== 0) {
            const top = moved.startSnapshot.top + diff.y;
            moved.item.delegate.top = snapY(top);
        }
        model.stickDecors();
    });
}

function endItemsMove(model, items) {
    if (items.length > 0) {
        items.forEach((moved) => {
            moved.endSnapshot = sizeLocationSnapshot(moved.item.delegate);
        });
        model.edit({
            name: (items.length === 1 ? `Widget '${items[0].item.name}' moved` : `Move of (${items.length}) widgets`),
            redo: () => {
                items.forEach((moved) => {
                    applySizeLocationSnapshot(moved.endSnapshot, moved.item.delegate);
                });
                model.stickDecors();
            },
            undo: () => {
                items.forEach((moved) => {
                    applySizeLocationSnapshot(moved.startSnapshot, moved.item.delegate);
                });
                model.stickDecors();
            }
        });
    }
}

export {
    resizeDecor,
    mouseDrag,
    sizeLocationSnapshot,
    applySizeLocationSnapshot,
    startItemsMove,
    proceedItemsMove,
    endItemsMove
};