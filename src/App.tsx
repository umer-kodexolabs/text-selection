import { useState } from "react";
import SelectableHtmlContent from "./HtmlTextSelection";

const htmlFromGPT = `
  <div>
    <h2>Programming Concepts</h2>
    <ul>
    <li><strong>Static Typing</strong>: Helps catch errors at compile time</li>
    <li>Dynamic Binding: <strong>Resolves references</strong> at runtime</li>
    </ul>
    <p>
    <span>
    These concepts are <em>fundamental</em> to
    <span>
    understanding
    </span>
    <span>
     programming.
    </span>
     </span>
    </p>
    <ul>
    <li><strong>Static Typing</strong>: Helps catch errors at compile time</li>
    <li>Dynamic Binding: <strong>Resolves references</strong> at runtime</li>
    </ul>
  </div>
`;

// const htmlFromGPT = `
//   <div>
//     <h2>Programming</h2>
//     <strong>Static Typing</strong>: Helps catch
//   </div>
// `;

const newHtmlContent = `
<p>
  <ul>
    <li>Promotes code reusability and maintainability</li>
    <li><strong>Asynchronous Processing</strong>: Enhances performance with non-blocking operations</li>
    <li><strong>Static Typing</strong>: Helps catch errors at compile time</li>
      <li>Dynamic Binding: <strong>Resolves references</strong> at runtime</li>
  </ul>
    <ul>
    <li><strong>Modular Design</strong>: Promotes code reusability and maintainability</li>
    <li><strong>Asynchronous Processing</strong>: Enhances performance with non-blocking operations</li>
    <li><strong>Static Typing</strong>: Helps catch errors at compile time</li>
      <li>Dynamic Binding: <strong>Resolves references</strong> at runtime</li>
  </ul>
    <ul>
    <li><strong>Modular Design</strong>: Promotes code reusability and maintainability</li>
    <li><strong>Asynchronous Processing</strong>: Enhances performance with non-blocking operations</li>
    <li>Helps catch errors at compile time</li>
      <li>Dynamic Binding: <strong>Resolves references</strong> at runtime</li>
  </ul>
  </p>
`;

function App() {
  const [html, setHtml] = useState(htmlFromGPT);
  const [isStreaming, setIsStreaming] = useState(false);
  const [cleanedHtml, setCleanedHtml] = useState("");

  const handleHtmlReplaceStream = () => {
    setIsStreaming(true);

    let currentIndex = 0;
    const targetLength = newHtmlContent.length;
    const interval = setInterval(() => {
      if (html.includes("<replace>") && currentIndex < targetLength) {
        setHtml((prevHtml) => {
          const updatedHtml = prevHtml.replace(
            /<replace>(.*?)<\/replace>/s,
            (_) => {
              const newContent = newHtmlContent.slice(0, currentIndex + 1);
              return `<replace>${newContent}</replace>`;
            }
          );
          return updatedHtml;
        });
        currentIndex++;
      } else {
        setHtml((prevHtml) => {
          const updatedHtml = prevHtml
            .replace("<replace>", "")
            .replace("</replace>", "");
          clearInterval(interval);
          setIsStreaming(false);
          return updatedHtml;
        });
      }
    }, 10);
  };

  return (
    <div className="my-4 flex mx-12">
      <div>
        <div className="flex items-center justify-center min-h-[30rem] mx-auto my-6">
          <SelectableHtmlContent
            setCleanedHtml={setCleanedHtml}
            htmlContent={html}
            setHtml={setHtml}
          />
        </div>
        <div className="flex items-center justify-center">
          <button
            disabled={isStreaming}
            onClick={handleHtmlReplaceStream}
            type="button"
            className="  text-white bg-blue-700 hover:bg-blue-800  font-medium rounded-lg text-sm px-5 py-2.5   mb-2 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none  "
          >
            Start Streaming
          </button>
        </div>
      </div>

      <div className="mx-auto my-6 flex flex-col">
        <h4 className="font-semibold">New Cleaned HTML</h4>
        {cleanedHtml && (
          <div className="box border h-full w-full">
            <div dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
