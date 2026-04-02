import type { AzBookingService } from "@hotel-crm/shared/features/azhotel_core";
import { createExtra, listExtraPresets } from "./extras";

type ExtrasEditorProps = {
  services: AzBookingService[];
  onChange: (services: AzBookingService[]) => void;
};

export function ExtrasEditor({ services, onChange }: ExtrasEditorProps) {
  function updateService(serviceId: string, patch: Partial<AzBookingService>) {
    onChange(
      services.map((service) =>
        service.id === serviceId
          ? {
              ...service,
              ...patch,
              total: (patch.quantity ?? service.quantity) * (patch.price ?? service.price)
            }
          : service
      )
    );
  }

  return (
    <div className="panel inset-panel">
      <p className="eyebrow">Допуслуги</p>
      <div className="status-actions">
        {listExtraPresets().map((preset) => (
          <button
            key={preset.name}
            className="secondary-button"
            type="button"
            onClick={() => onChange([...services, createExtra(preset.name, preset.price)])}
          >
            + {preset.name}
          </button>
        ))}
        <button
          className="secondary-button"
          type="button"
          onClick={() => onChange([...services, createExtra()])}
        >
          + Своя услуга
        </button>
      </div>
      <div className="screen compact-stack">
        {services.length === 0 ? (
          <p className="muted">Пока без допуслуг.</p>
        ) : null}
        {services.map((service) => (
          <div className="extras-row" key={service.id}>
            <input
              value={service.name}
              onChange={(event) => updateService(service.id, { name: event.target.value })}
              placeholder="Название услуги"
            />
            <input
              type="number"
              min="1"
              value={service.quantity}
              onChange={(event) =>
                updateService(service.id, { quantity: Math.max(1, Number(event.target.value) || 1) })
              }
            />
            <input
              type="number"
              min="0"
              value={service.price}
              onChange={(event) =>
                updateService(service.id, { price: Math.max(0, Number(event.target.value) || 0) })
              }
            />
            <div className="extras-total">{service.total}</div>
            <button
              className="secondary-button"
              type="button"
              onClick={() => onChange(services.filter((item) => item.id !== service.id))}
            >
              Убрать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
