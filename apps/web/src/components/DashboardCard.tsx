type DashboardCardProps = {
  title: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
  detail: string;
};

export function DashboardCard({
  title,
  value,
  tone = "neutral",
  detail
}: DashboardCardProps) {
  return (
    <section className={`card tone-${tone}`}>
      <p className="card-title">{title}</p>
      <strong className="card-value">{value}</strong>
      <p className="card-detail">{detail}</p>
    </section>
  );
}

