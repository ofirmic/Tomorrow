export type Parameter = 'TEMPERATURE' | 'WIND_SPEED' | 'PRECIPITATION';
export type Operator = 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ' | 'NE';

export function evaluateAlertCondition({
  parameter,
  operator,
  threshold,
  values,
}: {
  parameter: Parameter;
  operator: Operator;
  threshold: number;
  values: { temperatureC: number | null; windSpeedMps: number | null; precipitationMmHr: number | null };
}): { currentValue: number | null; triggered: boolean } {
  const valueMap = {
    TEMPERATURE: values.temperatureC,
    WIND_SPEED: values.windSpeedMps,
    PRECIPITATION: values.precipitationMmHr,
  } as const;
  const currentValue = valueMap[parameter];
  if (currentValue == null) return { currentValue, triggered: false };
  switch (operator) {
    case 'GT':
      return { currentValue, triggered: currentValue > threshold };
    case 'GTE':
      return { currentValue, triggered: currentValue >= threshold };
    case 'LT':
      return { currentValue, triggered: currentValue < threshold };
    case 'LTE':
      return { currentValue, triggered: currentValue <= threshold };
    case 'EQ':
      return { currentValue, triggered: currentValue === threshold };
    case 'NE':
      return { currentValue, triggered: currentValue !== threshold };
    default:
      return { currentValue, triggered: false };
  }
}


