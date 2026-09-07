import React, { useMemo } from 'react';
import { Question } from '../types';
import { extractQuestionMedia, extractOptionMedia } from '../utils/questionMedia';
import { QuestionImageViewer } from './QuestionImageViewer';

interface QuestionStatementContentProps {
  question: Question;
  headingClassName?: string;
  imagePosition?: 'before' | 'after';
}

export const QuestionStatementContent: React.FC<QuestionStatementContentProps> = ({
  question,
  headingClassName = 'text-xl md:text-2xl font-extrabold text-slate-900 leading-snug',
  imagePosition = 'before',
}) => {
  const media = useMemo(() => {
    return extractQuestionMedia(question.statement, question.imageUrl);
  }, [question.statement, question.imageUrl]);

  const imagesBlock = media.hasImages ? (
    <div className="space-y-4 my-3">
      {media.imageUrls.map((url, idx) => (
        <QuestionImageViewer
          key={idx}
          imageUrl={url}
          altText={`Imagem da questão ${idx + 1}`}
        />
      ))}
    </div>
  ) : null;

  return (
    <div className="space-y-4 mb-6">
      {imagePosition === 'before' && imagesBlock}

      {media.cleanStatement && (
        <h2 className={headingClassName}>
          {media.cleanStatement}
        </h2>
      )}

      {imagePosition === 'after' && imagesBlock}
    </div>
  );
};

interface OptionContentProps {
  optionText: string;
  textClassName?: string;
}

export const OptionContent: React.FC<OptionContentProps> = ({
  optionText,
  textClassName = 'text-sm md:text-base leading-relaxed font-medium',
}) => {
  const { imageUrl, cleanText } = useMemo(() => extractOptionMedia(optionText), [optionText]);

  if (imageUrl) {
    return (
      <div className="flex flex-col gap-2 flex-grow">
        {cleanText && <p className={textClassName}>{cleanText}</p>}
        <div className="max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-white p-1">
          <img
            src={imageUrl}
            alt="Opção com imagem"
            referrerPolicy="no-referrer"
            className="max-h-36 w-auto object-contain rounded-lg"
          />
        </div>
      </div>
    );
  }

  return <p className={`flex-grow ${textClassName}`}>{optionText}</p>;
};
