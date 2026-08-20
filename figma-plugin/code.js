/* global figma, __html__ */

figma.showUI(__html__, { width: 360, height: 420 });

function findTextNodeByName(name) {
  const nodes = figma.currentPage.findAll(
    (n) => n.type === "TEXT" && n.name === name,
  );
  return nodes[0] || null;
}

async function loadFontsForNode(node) {
  const fonts = node.getRangeAllFontNames(0, node.characters.length || 1);
  for (const font of fonts) {
    await figma.loadFontAsync(font);
  }
}

figma.ui.onmessage = async (msg) => {
  if (msg.type === "apply") {
    try {
      const nodeName = msg.nodeName || "__cv_body__";
      let target = null;

      if (figma.currentPage.selection.length === 1) {
        const sel = figma.currentPage.selection[0];
        if (sel.type === "TEXT") target = sel;
      }
      if (!target) {
        target = findTextNodeByName(nodeName);
      }
      if (!target) {
        figma.ui.postMessage({
          type: "error",
          message:
            "Nessun text node selezionato e nessun layer chiamato " +
            nodeName +
            ". Seleziona un text node o rinomina uno in " +
            nodeName +
            ".",
        });
        return;
      }

      await loadFontsForNode(target);
      const parts = [];
      if (msg.cvText) parts.push(msg.cvText);
      if (msg.coverLetter) {
        parts.push("");
        parts.push("— Lettera —");
        parts.push(msg.coverLetter);
      }
      target.characters = parts.join("\n");
      figma.currentPage.selection = [target];
      figma.viewport.scrollAndZoomIntoView([target]);
      figma.ui.postMessage({ type: "ok", message: "Testo applicato su Figma." });
      figma.notify("SuMisura: CV aggiornato");
    } catch (err) {
      figma.ui.postMessage({
        type: "error",
        message: err && err.message ? err.message : "Errore applicazione testo",
      });
    }
  }

  if (msg.type === "close") {
    figma.closePlugin();
  }
};
