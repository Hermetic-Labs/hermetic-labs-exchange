import { useState, useMemo } from 'react';
import { Calculator } from 'lucide-react';

export default function PayrollCalculator() {
  const [values, setValues] = useState({
    hourlyRate: 25,
    hoursWorked: 80,
    overtimeHours: 5,
    federalTax: 12,
    stateTax: 5,
    socialSecurity: 6.2,
    medicare: 1.45,
    healthInsurance: 150,
    retirement401k: 6,
  });

  const calculations = useMemo(() => {
    const regularPay = values.hourlyRate * values.hoursWorked;
    const overtimePay = values.hourlyRate * 1.5 * values.overtimeHours;
    const grossPay = regularPay + overtimePay;

    const federalTaxAmount = grossPay * (values.federalTax / 100);
    const stateTaxAmount = grossPay * (values.stateTax / 100);
    const socialSecurityAmount = grossPay * (values.socialSecurity / 100);
    const medicareAmount = grossPay * (values.medicare / 100);
    const retirement401kAmount = grossPay * (values.retirement401k / 100);

    const totalDeductions = federalTaxAmount + stateTaxAmount + socialSecurityAmount + medicareAmount + values.healthInsurance + retirement401kAmount;
    const netPay = grossPay - totalDeductions;

    return {
      regularPay,
      overtimePay,
      grossPay,
      federalTaxAmount,
      stateTaxAmount,
      socialSecurityAmount,
      medicareAmount,
      retirement401kAmount,
      totalDeductions,
      netPay,
    };
  }, [values]);

  const InputField = ({ label, name, value, suffix = '' }: { label: string; name: keyof typeof values; value: number; suffix?: string }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center">
        <input
          type="number"
          value={value}
          onChange={e => setValues({ ...values, [name]: parseFloat(e.target.value) || 0 })}
          className="w-full border rounded-l px-3 py-2"
          step="0.01"
        />
        {suffix && <span className="bg-gray-100 border border-l-0 rounded-r px-3 py-2 text-gray-600">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
        <Calculator size={28} /> Payroll Calculator
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Earnings</h2>
            <div className="space-y-4">
              <InputField label="Hourly Rate" name="hourlyRate" value={values.hourlyRate} suffix="$/hr" />
              <InputField label="Hours Worked (Pay Period)" name="hoursWorked" value={values.hoursWorked} suffix="hrs" />
              <InputField label="Overtime Hours" name="overtimeHours" value={values.overtimeHours} suffix="hrs" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Tax Rates</h2>
            <div className="space-y-4">
              <InputField label="Federal Tax" name="federalTax" value={values.federalTax} suffix="%" />
              <InputField label="State Tax" name="stateTax" value={values.stateTax} suffix="%" />
              <InputField label="Social Security" name="socialSecurity" value={values.socialSecurity} suffix="%" />
              <InputField label="Medicare" name="medicare" value={values.medicare} suffix="%" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Deductions</h2>
            <div className="space-y-4">
              <InputField label="Health Insurance" name="healthInsurance" value={values.healthInsurance} suffix="$" />
              <InputField label="401(k) Contribution" name="retirement401k" value={values.retirement401k} suffix="%" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 h-fit sticky top-8">
          <h2 className="text-lg font-semibold mb-6">Pay Summary</h2>

          <div className="space-y-4">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Regular Pay</span>
              <span className="font-medium">${calculations.regularPay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">Overtime Pay (1.5x)</span>
              <span className="font-medium">${calculations.overtimePay.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2 border-b bg-blue-50 -mx-6 px-6">
              <span className="font-semibold">Gross Pay</span>
              <span className="font-bold text-blue-600">${calculations.grossPay.toFixed(2)}</span>
            </div>

            <div className="pt-4">
              <h3 className="font-medium text-gray-700 mb-2">Deductions</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Federal Tax</span><span>-${calculations.federalTaxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>State Tax</span><span>-${calculations.stateTaxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Social Security</span><span>-${calculations.socialSecurityAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Medicare</span><span>-${calculations.medicareAmount.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Health Insurance</span><span>-${values.healthInsurance.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>401(k)</span><span>-${calculations.retirement401kAmount.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex justify-between py-2 border-t">
              <span className="text-gray-600">Total Deductions</span>
              <span className="font-medium text-red-600">-${calculations.totalDeductions.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-4 bg-green-50 -mx-6 px-6 rounded-b-lg">
              <span className="font-bold text-lg">Net Pay</span>
              <span className="font-bold text-lg text-green-600">${calculations.netPay.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
