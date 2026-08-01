const stats = [
  { value: "12,000+", label: "Verified Doctors" },
  { value: "850+", label: "Partner Facilities" },
  { value: "98.4%", label: "Shift Fill Rate" },
  { value: "24/7", label: "Support Coverage" },
];

export function Stats() {
  return (
    <section className="border-y border-border bg-card">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-6 py-10 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="text-3xl font-semibold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
