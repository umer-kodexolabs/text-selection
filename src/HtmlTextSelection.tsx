import { useState, useRef, useEffect, MouseEventHandler } from "react";

interface SelectableHtmlContentProps {
  htmlContent: string;
  setCleanedHtml: (html: string) => void;
  setHtml: (html: string) => void;
}

const SelectableHtmlContent = ({
  htmlContent,
  setCleanedHtml,
  setHtml,
}: SelectableHtmlContentProps) => {
  const [selectedRange, setSelectedRange] = useState({
    start: 0,
    end: 0,
  });
  const [dialogPosition, setDialogPosition] = useState({ x: 0, y: 0 });
  const [showInput, setShowInput] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const selectionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (contentRef.current) {
      const wrapTextNodes = (element: HTMLElement, index = { value: 0 }) => {
        const walker = document.createTreeWalker(
          element,
          NodeFilter.SHOW_TEXT,
          null
          // false
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
          const segments = node.textContent?.match(/\s+|\S+/g) || [];
          const fragment = document.createDocumentFragment();

          segments.forEach((segment) => {
            const span = document.createElement("span");
            span.textContent = segment;
            span.setAttribute("data-word-index", (index.value++).toString());
            span.classList.add(
              segment.trim() ? "selectable-word" : "selectable-space"
            );
            fragment.appendChild(span);
          });

          node.parentNode?.replaceChild(fragment, node);
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
    const elements = contentRef.current?.querySelectorAll(
      ".selectable-word, .selectable-space"
    );
    elements?.forEach((element) => {
      element.classList.remove("selected");
    });

    elements?.forEach((element) => {
      // const elementIndex = parseInt(element.getAttribute("data-word-index"));
      const dataWordIndex = element.getAttribute("data-word-index");
      const elementIndex =
        dataWordIndex !== null ? parseInt(dataWordIndex, 10) : NaN;

      if (
        !isNaN(elementIndex) &&
        elementIndex >= selectedRange.start &&
        elementIndex <= selectedRange.end
      ) {
        element.classList.add("selected");
      }
    });
  };

  useEffect(() => {
    updateSelection();
  }, [selectedRange]);

  const handleMouseDown: MouseEventHandler<HTMLDivElement> = (e) => {
    if (
      e.target instanceof HTMLElement &&
      e.target.closest(".selection-dialog")
    )
      return;
    const target =
      e.target instanceof HTMLElement &&
      e.target.closest(".selectable-word, .selectable-space");
    if (target) {
      e.preventDefault();
      setIsSelecting(true);
      const index = parseInt(target.getAttribute("data-word-index") || "0");
      selectionStartRef.current = index;
      setSelectedRange({ start: index, end: index });
    }
  };

  const handleMouseMove: MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isSelecting) return;

    const target =
      e.target instanceof HTMLElement &&
      e.target.closest(".selectable-word, .selectable-space");
    if (target) {
      const currentIndex = parseInt(
        target.getAttribute("data-word-index") || "0"
      );
      const start = Math.min(selectionStartRef.current ?? 0, currentIndex);
      const end = Math.max(selectionStartRef.current ?? 0, currentIndex);
      setSelectedRange({ start, end });
    }
  };

  const handleMouseUp: MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isSelecting) return;

    const target =
      e.target instanceof HTMLElement &&
      e.target.closest(".selectable-word, .selectable-space");
    if (target) {
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
    const handleClickOutside = (e: MouseEvent) => {
      if (
        !contentRef.current?.contains(e.target as Node) &&
        !(
          e.target instanceof HTMLElement &&
          e.target.closest(".selection-dialog")
        )
      ) {
        setSelectedRange({ start: 0, end: 0 });
        setShowInput(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (contentRef.current) {
      const contentDiv = contentRef.current.innerHTML;
      const extraction = wrapWithReplaceTags(
        contentDiv,
        selectedRange.start as number,
        selectedRange.end as number
      );

      const cleanedHTML = removeSpanTags(extraction);
      const replaceChunk = cleanedHTML.match(/<replace>.*<\/replace>/s)?.[0];
      console.log("cleanedHTML----------------", cleanedHTML);
      console.log("replaceChunk...........", replaceChunk);
      setCleanedHtml(cleanedHTML);
      setHtml(cleanedHTML);
    }
    setShowInput(false);
  };

  function wrapWithReplaceTags(
    html: string,
    startIndex: number,
    endIndex: number
  ) {
    console.log("html...............", html);

    const startRegex = new RegExp(
      `<span[^>]*?data-word-index=["']${startIndex}["'][^>]*?>.*?</span>`,
      "g"
    );
    const endRegex = new RegExp(
      `<span[^>]*?data-word-index=["']${endIndex}["'][^>]*?>.*?</span>`,
      "g"
    );

    html = html.replace(startRegex, (match: string) => `<replace>${match}`);
    html = html.replace(endRegex, (match: string) => `${match}</replace>`);

    return html;
  }

  function removeSpanTags(htmlContent: string) {
    // regex to remove span tags with the specific classes
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
