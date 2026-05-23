type PageHeaderProps = {
  eyebrow: string;
  title: string;
  copy: string;
};

export function PageHeader({ eyebrow, title, copy }: PageHeaderProps) {
  return (
    <section className="page-header">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{copy}</p>
    </section>
  );
}

