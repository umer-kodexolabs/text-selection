//@ts-nocheck
import { useState, useRef, useEffect } from "react";
const SelectableHtmlContent = ({ htmlContent, setCleanedHtml }) => {
  const [selectedRange, setSelectedRange] = useState({
    start: null,
    end: null,
  });
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const contentRef = useRef(null);
  const selectionStartRef = useRef(null);

  useEffect(() => {
    if (contentRef.current) {
      const wrapTextNodes = (element, index = { value: 0 }) => {
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let node;
        const nodesToReplace = [];

        while ((node = walker.nextNode())) {
          if (node.textContent) {
            nodesToReplace.push(node);
          }
        }

        nodesToReplace.forEach((node) => {
          // Split by characters while preserving whitespace groups
          const segments = node.textContent.match(/\s+|\S+/g) || [];
          const fragment = document.createDocumentFragment();

          segments.forEach((segment) => {
            const span = document.createElement("span");
            span.textContent = segment;
            span.setAttribute("data-word-index", index.value++);
            span.classList.add(
              segment.trim() ? "selectable-word" : "selectable-space"
            );
            fragment.appendChild(span);
          });

          node.parentNode.replaceChild(fragment, node);
        });

        return index.value;
      };

      const contentDiv = contentRef.current;
      contentDiv.innerHTML = htmlContent;
      wrapTextNodes(contentDiv);
      contentDiv.addEventListener("selectstart", (e) => e.preventDefault());
    }
  }, [htmlContent]);

  const updateSelection = () => {
    const elements = contentRef.current.querySelectorAll(
      ".selectable-word, .selectable-space"
    );
    elements.forEach((element) => {
      element.classList.remove("selected");
    });

    if (selectedRange.start !== null && selectedRange.end !== null) {
      elements.forEach((element) => {
        const elementIndex = parseInt(element.getAttribute("data-word-index"));
        if (
          elementIndex >= selectedRange.start &&
          elementIndex <= selectedRange.end
        ) {
          element.classList.add("selected");
        }
      });
    }
  };

  useEffect(() => {
    updateSelection();
  }, [selectedRange]);

  const handleMouseDown = (e) => {
    if (e.target.closest(".selection-dialog")) return;
    const target = e.target.closest(".selectable-word, .selectable-space");
    if (target) {
      e.preventDefault();
      setIsSelecting(true);
      const index = parseInt(target.getAttribute("data-word-index"));
      selectionStartRef.current = index;
      setSelectedRange({ start: index, end: index });
    }
  };

  const handleMouseMove = (e) => {
    if (!isSelecting) return;

    const target = e.target.closest(".selectable-word, .selectable-space");
    if (target) {
      const currentIndex = parseInt(target.getAttribute("data-word-index"));
      const start = Math.min(selectionStartRef.current, currentIndex);
      const end = Math.max(selectionStartRef.current, currentIndex);
      setSelectedRange({ start, end });
    }
  };

  const handleMouseUp = (e) => {
    if (!isSelecting) return;

    const target = e.target.closest(".selectable-word, .selectable-space");
    if (target && selectedRange.start !== null) {
      const rect = target.getBoundingClientRect();
      setDialogPosition({
        x: rect.left + window.scrollX,
        y: rect.bottom + window.scrollY + 5,
      });
      setShowInput(true);
    }
    setIsSelecting(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        !contentRef.current?.contains(e.target) &&
        !e.target.closest(".selection-dialog")
      ) {
        setSelectedRange({ start: null, end: null });
        setShowInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedText = Array.from(
      contentRef.current.querySelectorAll(".selectable-word, .selectable-space")
    )
      .filter((el, i) => i >= selectedRange.start && i <= selectedRange.end)
      .map((el) => el.textContent)
      .join(""); // Remove join(" ") to preserve original spacing

    const contentDiv = contentRef.current.innerHTML;
    const updatedContent = wrapWithReplaceTag(
      contentDiv,
      selectedRange.start,
      selectedRange.end
    );

    const cleanedHTML = removeSpanTags(updatedContent);
    setCleanedHtml(cleanedHTML);
    // console.log("updatedContent----------------", updatedContent);
    console.log("cleanedHTML----------------", cleanedHTML);
  };

  function wrapWithReplaceTag(htmlContent, startIndex, endIndex) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");

    const spans = doc.querySelectorAll("span[data-word-index]");
    let replaceContent = ""; // Holds the combined content to wrap
    let insideRange = false; // Tracks if we're inside the range

    spans.forEach((span) => {
      const wordIndex = parseInt(span.getAttribute("data-word-index"), 10);

      if (wordIndex >= startIndex && wordIndex <= endIndex) {
        // Accumulate content for wrapping
        replaceContent += span.outerHTML;
        span.remove(); // Remove from the DOM for later replacement
        insideRange = true;
      } else if (insideRange) {
        // Exiting the range: insert <replace> tag
        const replaceTag = doc.createElement("replace");
        replaceTag.innerHTML = replaceContent;
        span.before(replaceTag); // Insert <replace> before the current span
        replaceContent = ""; // Reset for next range
        insideRange = false;
      }
    });

    // If range ends at the last span
    if (replaceContent) {
      const replaceTag = doc.createElement("replace");
      replaceTag.innerHTML = replaceContent;
      doc.body.appendChild(replaceTag);
    }

    return doc.body.innerHTML;
  }

  function removeSpanTags(htmlContent) {
    // Use regex to remove span tags with the specific classes
    return htmlContent.replace(
      /<span[^>]*class="selectable-(space|word)[^>]*">(.*?)<\/span>/gis,
      "$2"
    );
  }

  return (
    <div className="relative h-full">
      <div
        ref={contentRef}
        className="select-none p-4 h-full bg-white border border-gray-200 rounded-md"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      />

      <style jsx global>{`
        .selectable-word,
        .selectable-space {
          cursor: pointer;
          padding: 2px 0;
          border-radius: 0px;
          user-select: none;
          -webkit-user-select: none;
          display: inline;
        }
        .selectable-word.selected {
          background-color: #93daef;
          color: #1d809e;
        }
        .selectable-space.selected {
          background-color: #93daef;
          color: #1d809e;
        }
      `}</style>

      {showInput && (
        <div
          className="selection-dialog absolute z-10 p-2 bg-white border border-gray-200 rounded-md shadow-lg"
          style={{
            left: `${dialogPosition.x}px`,
            top: `${dialogPosition.y}px`,
          }}
        >
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm"
              placeholder="Enter text..."
              autoFocus
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
            >
              Submit
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default SelectableHtmlContent;
