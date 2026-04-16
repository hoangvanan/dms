'use client'
import type { PredefinedTestConditionsContent } from '@/types/specs'

interface Props {
  content: PredefinedTestConditionsContent
  onChange: (content: PredefinedTestConditionsContent) => void
  disabled: boolean
}

interface FieldDef {
  key: keyof PredefinedTestConditionsContent
  label: string
  placeholder: string
}

const ENVIRONMENTAL_FIELDS: FieldDef[] = [
  { key: 'operating_temp', label: 'Operating Temperature', placeholder: 'e.g. -20°C to +70°C' },
  { key: 'storage_temp', label: 'Storage Temperature', placeholder: 'e.g. -40°C to +80°C' },
  { key: 'rated_max_ambient', label: 'Rated Max Ambient', placeholder: 'e.g. 45°C' },
  { key: 'operation_humidity', label: 'Operation Humidity', placeholder: 'e.g. 10% to 95%' },
  { key: 'storage_humidity', label: 'Storage Humidity', placeholder: 'e.g. 10% to 95%' },
  { key: 'water_protection', label: 'Water Protection', placeholder: 'e.g. IP65 except connectors' },
  { key: 'indication_protection', label: 'Indication Protection', placeholder: '' },
  { key: 'protection_class', label: 'Protection Class', placeholder: 'e.g. I' },
  { key: 'operation_environment', label: 'Operation Environment', placeholder: 'e.g. Indoor Use' },
]

const INPUT_FIELDS: FieldDef[] = [
  { key: 'rated_input_voltage', label: 'Rated Input Voltage', placeholder: 'e.g. 190-240Vac' },
  { key: 'extended_input_voltage', label: 'Extended Input Voltage', placeholder: 'e.g. 190-264Vac' },
  { key: 'input_overvoltage_protection', label: 'Input Overvoltage Protection', placeholder: 'e.g. 264-270Vac, no damage' },
  { key: 'rated_input_frequency', label: 'Rated Input Frequency', placeholder: 'e.g. 50-60Hz' },
  { key: 'operable_frequency', label: 'Operable Frequency', placeholder: 'e.g. 47-63Hz' },
  { key: 'input_current', label: 'Input Current', placeholder: 'e.g. 4650mA @230Vac' },
  { key: 'input_power', label: 'Input Power', placeholder: 'e.g. 1080W @230Vac' },
  { key: 'standby_power', label: 'Standby Power', placeholder: 'e.g. <3W' },
]

const OUTPUT_FIELDS: FieldDef[] = [
  { key: 'charging_voltage_range', label: 'Charging Voltage Range', placeholder: 'e.g. 36-59.3Vdc' },
  { key: 'battery_configuration', label: 'Battery Configuration', placeholder: 'e.g. Hero Li-ion (14S)' },
  { key: 'charge_current', label: 'Charge Current', placeholder: 'e.g. 0-20A' },
  { key: 'reverse_current', label: 'Reverse Current', placeholder: 'e.g. <1mA @59.3V' },
  { key: 'max_efficiency', label: 'Max Efficiency', placeholder: 'e.g. ≥92%' },
  { key: 'power_factor', label: 'Power Factor', placeholder: 'e.g. ≥0.98 @220Vac full load' },
]

export default function TestConditionsEditor({ content, onChange, disabled }: Props) {
  const handleFieldChange = (key: keyof PredefinedTestConditionsContent, value: string) => {
    onChange({ ...content, [key]: value })
  }

  const inputStyle = {
    width: '100%',
    padding: '5px 8px',
    borderRadius: '4px',
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  }

  const sectionLabelStyle = {
    fontSize: '11px',
    fontWeight: 600 as const,
    color: 'var(--accent)',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
    marginBottom: '8px',
    marginTop: '16px',
  }

  const renderFieldGroup = (title: string, fields: FieldDef[], isFirst = false) => (
    <div>
      <div style={{ ...sectionLabelStyle, marginTop: isFirst ? '0' : '16px' }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {fields.map(f => (
          <div key={f.key} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label style={{
              width: '180px', minWidth: '180px', fontSize: '11px',
              fontWeight: 500, color: 'var(--text-secondary)',
            }}>
              {f.label}
            </label>
            <input
              value={(content[f.key] as string) || ''}
              onChange={(e) => handleFieldChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              disabled={disabled}
              style={inputStyle}
            />
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div>
      {renderFieldGroup('Environmental', ENVIRONMENTAL_FIELDS, true)}
      {renderFieldGroup('Input Data', INPUT_FIELDS)}
      {renderFieldGroup('Output Data', OUTPUT_FIELDS)}
    </div>
  )
}
