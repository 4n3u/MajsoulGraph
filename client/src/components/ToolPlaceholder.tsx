import { useId } from "react";

interface ToolPlaceholderProps {
  title: string;
  description?: string;
}

export function ToolPlaceholder({ title, description }: ToolPlaceholderProps) {
  const titleId = useId();

  return (
    <section className="tool-placeholder" aria-labelledby={titleId}>
      <h2 id={titleId}>{title}</h2>
      {description ? <p>{description}</p> : null}
    </section>
  );
}
