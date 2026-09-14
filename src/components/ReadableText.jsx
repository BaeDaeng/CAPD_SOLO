import React from 'react';

export default function ReadableText({
  value,
  className = '',
  splitLongText = false,
  sentencesPerParagraph = 2,
}) {
  const blocks = parseReadableBlocks(value, { splitLongText, sentencesPerParagraph });

  return (
    <div className={`space-y-2 break-words ${className}`}>
      {blocks.map((block, index) => (
        <ReadableBlock key={`${block.type}-${block.text}-${index}`} block={block} />
      ))}
    </div>
  );
}

function ReadableBlock({ block }) {
  if (block.type === 'heading2') {
    return (
      <h3 className="mt-3 text-lg font-black leading-7 text-current first:mt-0">
        {renderInlineMarkdown(block.text)}
      </h3>
    );
  }

  if (block.type === 'heading3') {
    return (
      <h4 className="mt-3 text-base font-black leading-7 text-current first:mt-0">
        {renderInlineMarkdown(block.text)}
      </h4>
    );
  }

  if (block.type === 'heading') {
    return (
      <h5 className="mt-2 text-sm font-black leading-6 text-current first:mt-0">
        {renderInlineMarkdown(block.text)}
      </h5>
    );
  }

  if (block.type === 'bullet') {
    return (
      <div className="flex gap-2 leading-7">
        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-50" />
        <p className="min-w-0">{renderInlineMarkdown(block.text)}</p>
      </div>
    );
  }

  if (block.type === 'ordered') {
    return (
      <div className="flex gap-2 leading-7">
        <span className="shrink-0 font-black text-current opacity-70">{block.order}.</span>
        <p className="min-w-0">{renderInlineMarkdown(block.text)}</p>
      </div>
    );
  }

  return <p className="leading-7">{renderInlineMarkdown(block.text)}</p>;
}

function parseReadableBlocks(value, options = {}) {
  const text = normalizeReadableMarkdown(String(value || '').trim());
  if (!text) return [{ type: 'paragraph', text: '-' }];

  const lines = text
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const hasMarkdownShape = lines.some(
    line => /^#{1,6}\s+/.test(line) || /^[-*]\s+/.test(line) || /^\d+\.\s*/.test(line),
  );

  if (hasMarkdownShape) {
    return lines.flatMap(line => splitReadableBlock(parseMarkdownLine(line), options));
  }

  if (options.splitLongText) {
    return splitNaturalParagraphs(text, options.sentencesPerParagraph)
      .map(paragraph => ({ type: 'paragraph', text: paragraph }));
  }

  return [{ type: 'paragraph', text: text.replace(/\s+/g, ' ') }];
}

function splitReadableBlock(block, options = {}) {
  if (!options.splitLongText || !['paragraph', 'bullet', 'ordered'].includes(block.type)) {
    return [block];
  }

  const paragraphs = splitNaturalParagraphs(block.text, options.sentencesPerParagraph);
  if (paragraphs.length <= 1) return [block];

  return paragraphs.map((paragraph, index) => (
    index === 0
      ? { ...block, text: paragraph }
      : { type: 'paragraph', text: paragraph }
  ));
}

function normalizeReadableMarkdown(text) {
  return text
    .replace(/\*\*(\d+)\.\s*\n+\s*([^*\n]+?:)\*\*/g, '$1. **$2**')
    .replace(/\*\*(\d+)\.\s*([^*\n]+?:)\*\*/g, '$1. **$2**');
}

function splitNaturalParagraphs(text, sentencesPerParagraph = 2) {
  const compactText = text.replace(/\s+/g, ' ').trim();
  const sentences = splitSentences(compactText);

  if (sentences.length <= 1) {
    return [compactText];
  }

  const paragraphSize = Math.max(1, sentencesPerParagraph);
  const paragraphs = [];

  for (let index = 0; index < sentences.length; index += paragraphSize) {
    paragraphs.push(sentences.slice(index, index + paragraphSize).join(' '));
  }

  return paragraphs;
}

function splitSentences(text) {
  const sentences = [];
  let current = '';

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const prev = text[index - 1] || '';
    const next = text[index + 1] || '';

    current += char;

    if (!['.', '!', '?'].includes(char)) continue;

    const isDecimalPoint = /\d/.test(prev) && /\d/.test(next);
    const hasBoundary = !next || /\s/.test(next);

    if (!isDecimalPoint && hasBoundary) {
      const sentence = current.trim();
      if (sentence) sentences.push(sentence);
      current = '';

      while (/\s/.test(text[index + 1] || '')) {
        index += 1;
      }
    }
  }

  const rest = current.trim();
  if (rest) sentences.push(rest);

  return sentences;
}

function parseMarkdownLine(line) {
  const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
  if (headingMatch) {
    const level = headingMatch[1].length;
    const type = level <= 2 ? 'heading2' : level === 3 ? 'heading3' : 'heading';
    return { type, text: headingMatch[2].trim() };
  }

  const bulletMatch = line.match(/^[-*]\s+(.+)$/);
  if (bulletMatch) {
    return { type: 'bullet', text: bulletMatch[1].trim() };
  }

  const orderedMatch = line.match(/^(\d+)\.\s*(.+)$/);
  if (orderedMatch) {
    return { type: 'ordered', order: orderedMatch[1], text: orderedMatch[2].trim() };
  }

  return { type: 'paragraph', text: line };
}

function renderInlineMarkdown(text) {
  return String(text)
    .split(/(\*\*[^*]+\*\*|__[^_]+__)/g)
    .filter(Boolean)
    .map((part, index) => {
      const boldMatch = part.match(/^(\*\*|__)(.+)\1$/);
      if (boldMatch) {
        return <strong key={`${part}-${index}`} className="font-black">{boldMatch[2]}</strong>;
      }

      return part.replace(/\*\*/g, '').replace(/__/g, '');
    });
}
