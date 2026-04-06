const VIDEO_EXT = /\.(mp4|webm|mov|ogg)$/i;

function makeConsentNode(src) {
  return {
    type: "element",
    tagName: "div",
    properties: { className: ["video-consent"], dataVideoSrc: src },
    children: [
      {
        type: "element",
        tagName: "div",
        properties: { className: ["video-consent-overlay"] },
        children: [
          {
            type: "element",
            tagName: "button",
            properties: { className: ["video-consent-btn"], type: "button" },
            children: [
              {
                type: "element",
                tagName: "svg",
                properties: {
                  xmlns: "http://www.w3.org/2000/svg",
                  width: "48",
                  height: "48",
                  viewBox: "0 0 24 24",
                  fill: "currentColor",
                },
                children: [
                  {
                    type: "element",
                    tagName: "path",
                    properties: { d: "M8 5v14l11-7z" },
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            type: "element",
            tagName: "p",
            properties: { className: ["video-consent-notice"] },
            children: [
              { type: "text", value: "Click to load video (connects to GitHub)" },
            ],
          },
        ],
      },
    ],
  };
}

function visit(node, callback) {
  if (!node) return;
  if (node.type === "element") callback(node);
  if (node.children) {
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      if (child.type !== "element") continue;

      // Pattern A: <video src="...">
      if (child.tagName === "video" && child.properties?.src) {
        node.children[i] = makeConsentNode(child.properties.src);
        continue;
      }

      // Pattern B: <p><a href="...mp4">...mp4</a></p>
      if (
        child.tagName === "p" &&
        child.children?.length === 1 &&
        child.children[0].type === "element" &&
        child.children[0].tagName === "a" &&
        VIDEO_EXT.test(child.children[0].properties?.href || "")
      ) {
        node.children[i] = makeConsentNode(child.children[0].properties.href);
        continue;
      }

      visit(child, callback);
    }
  }
}

export default function rehypeVideoConsent() {
  return (tree) => {
    visit(tree, () => {});
  };
}
