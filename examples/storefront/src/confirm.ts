/** A tiny non-blocking confirmation modal, used both as registerPack's `confirm`
 * option and by the page's own buttons for requiresConfirmation tools. */
export function confirmAction(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'confirm-overlay';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const text = document.createElement('p');
    text.textContent = message;

    const actions = document.createElement('div');
    actions.className = 'confirm-actions';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm';
    confirmButton.className = 'confirm-button confirm-button--primary';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';
    cancelButton.className = 'confirm-button';

    function close(result: boolean) {
      overlay.remove();
      resolve(result);
    }

    confirmButton.addEventListener('click', () => close(true));
    cancelButton.addEventListener('click', () => close(false));

    actions.append(cancelButton, confirmButton);
    dialog.append(text, actions);
    overlay.append(dialog);
    document.body.append(overlay);
  });
}
