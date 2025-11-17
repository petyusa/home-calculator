import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';

interface CalculationResults {
  downpayment: number;
  leftover: number;
  expectedSelling: number;
  capitalAfterSelling: number;
  capitalGainTax: number;
  attorneyFee: number;
  lastFee: number;
  mortgageAmount: number;
  monthlyInstallment: number;
}

interface Prepayment {
  amount: number;
  feePercent: number;
  month: number; // 1-based
  effect: 'reducePayment' | 'reduceTerm';
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  // New Apartment signals
  protected readonly apartmentPrice = signal(159400000);
  protected readonly parkingPrice = signal(8000000);
  protected readonly storagePrice = signal(1911000);
  protected readonly movingCosts = signal(5000000);

  // Current Apartment signals
  protected readonly currentPrice = signal(105000000);
  protected readonly currentMortgage = signal(8300000);

  // Financing signals
  protected readonly interestRate = signal(6.09);
  protected readonly interestOptions = [5.5, 6.09, 6.5, 7, 8, 9];
  protected readonly expectedChangeOptions = [-5, -2, 0, 3, 5, 7, 10];
  protected readonly expectedPriceChange = signal(0);
  protected readonly yearsToSale = signal(0);
  protected readonly downpaymentPercent = signal(0);
  protected readonly currentSavings = signal(15000000);
  protected readonly termYears = signal(30);
  // Attorney's fee options (percent of total apartment price)
  protected readonly attorneyFeeOptions = [0, 0.5, 0.7, 1];
  protected readonly attorneyFeePercent = signal(0.0);

  // Reactive form backing the UI (keeps inputs in a single form object)
  protected readonly form: FormGroup = new FormGroup({
    apartmentPrice: new FormControl(this.apartmentPrice()),
    parkingPrice: new FormControl(this.parkingPrice()),
    storagePrice: new FormControl(this.storagePrice()),
    movingCosts: new FormControl(this.movingCosts()),

    currentPrice: new FormControl(this.currentPrice()),
    currentMortgage: new FormControl(this.currentMortgage()),

    interestRate: new FormControl(this.interestRate()),
    downpaymentPercent: new FormControl(this.downpaymentPercent()),
    expectedPriceChange: new FormControl(this.expectedPriceChange()),
    yearsToSale: new FormControl(this.yearsToSale()),
    currentSavings: new FormControl(this.currentSavings()),
    termYears: new FormControl(this.termYears()),
    attorneyFeePercent: new FormControl(this.attorneyFeePercent()),
    // Note: single optional prepayment controls removed. Use the Multiple Prepayments inputs below.
  });

  // Subscribe to form changes and update signals so computed() continues to work
  constructor() {
    this.form.valueChanges.subscribe((v: any) => {
      // Coerce numeric values and protect against null/undefined
      if (v.apartmentPrice != null)
        this.apartmentPrice.set(Number(v.apartmentPrice) || 0);
      if (v.parkingPrice != null)
        this.parkingPrice.set(Number(v.parkingPrice) || 0);
      if (v.storagePrice != null)
        this.storagePrice.set(Number(v.storagePrice) || 0);
      if (v.movingCosts != null)
        this.movingCosts.set(Number(v.movingCosts) || 0);

      if (v.currentPrice != null)
        this.currentPrice.set(Number(v.currentPrice) || 0);
      if (v.currentMortgage != null)
        this.currentMortgage.set(Number(v.currentMortgage) || 0);

      if (v.interestRate != null)
        this.interestRate.set(Number(v.interestRate) || 0);
      if (v.downpaymentPercent != null)
        this.downpaymentPercent.set(Number(v.downpaymentPercent) || 0);
      if (v.expectedPriceChange != null)
        this.expectedPriceChange.set(Number(v.expectedPriceChange) || 0);
      if (v.yearsToSale != null)
        this.yearsToSale.set(Number(v.yearsToSale) || 0);
      if (v.currentSavings != null)
        this.currentSavings.set(Number(v.currentSavings) || 0);
      if (v.termYears != null) this.termYears.set(Number(v.termYears) || 0);
      if (v.attorneyFeePercent != null)
        this.attorneyFeePercent.set(Number(v.attorneyFeePercent) || 0);
      // single optional prepayment form controls removed — nothing to sync here
    });
  }

  // Computed total apartment price
  protected readonly totalApartmentPrice = computed(
    () => this.apartmentPrice() + this.parkingPrice() + this.storagePrice()
  );

  // Single prepayment signals removed. Use the newPrepayment* signals below.

  // Multiple prepayments support
  protected readonly prepayments = signal<Prepayment[]>([]);

  // Control visibility for the prepayments accordion/form — hidden by default
  protected readonly prepaymentFormOpen = signal(false);

  // Temporary inputs for adding a prepayment
  protected readonly newPrepaymentAmount = signal(0);
  protected readonly newPrepaymentFeePercent = signal(0);
  protected readonly newPrepaymentMonth = signal(1);
  protected readonly newPrepaymentEffect = signal<
    'reducePayment' | 'reduceTerm'
  >('reducePayment');

  protected addPrepayment(): void {
    // Use the multiple-prepayment inputs (newPrepayment* signals).
    let amt = Number(this.newPrepaymentAmount()) || 0;
    let fee = Number(this.newPrepaymentFeePercent()) || 0;
    let month = Math.max(1, Math.floor(Number(this.newPrepaymentMonth()) || 1));
    const effect = this.newPrepaymentEffect();

    amt = Math.max(0, amt);
    fee = Math.max(0, fee);

    if (amt <= 0) return;

    const entry: Prepayment = { amount: amt, feePercent: fee, month, effect };
    this.prepayments.update((arr) => [...arr, entry]);

    // Reset newPrepayment signals (the UI uses these)
    this.newPrepaymentAmount.set(0);
    this.newPrepaymentFeePercent.set(0);
    this.newPrepaymentMonth.set(1);
    this.newPrepaymentEffect.set('reducePayment');

    // Keep the prepayment form open when a prepayment is added so user sees
    // the newly-added entry. (Small UX improvement.)
    this.prepaymentFormOpen.set(true);
  }

  protected removePrepayment(index: number): void {
    this.prepayments.update((arr) => arr.filter((_, i) => i !== index));
  }

  // Input handlers called from the template to ensure parsing happens in TS
  protected onNewPrepaymentAmount(value: any): void {
    const n = Number(value);
    this.newPrepaymentAmount.set(isNaN(n) ? 0 : n);
  }

  protected onNewPrepaymentFeePercent(value: any): void {
    const n = Number(value);
    this.newPrepaymentFeePercent.set(isNaN(n) ? 0 : n);
  }

  protected onNewPrepaymentMonth(value: any): void {
    const n = Math.max(1, Math.floor(Number(value) || 1));
    this.newPrepaymentMonth.set(n);
  }

  // Main calculation results
  protected readonly results = computed((): CalculationResults => {
    const totalPrice = this.totalApartmentPrice();
    const downpayment = totalPrice * (this.downpaymentPercent() / 100);
    const leftover = totalPrice - downpayment;

    const expectedChange = this.expectedPriceChange() / 100;
    const years = this.yearsToSale();
    const expectedSelling =
      this.currentPrice() * Math.pow(1 + expectedChange, years);

    const capitalAfterSelling =
      expectedSelling - this.currentMortgage() + this.currentSavings();

    const profit = totalPrice - expectedSelling;
    const capitalGainTax = Math.max(0, profit) * 0.04;

    const attorneyFee = totalPrice * (this.attorneyFeePercent() / 100);

    const lastFee =
      leftover + capitalGainTax + attorneyFee + this.movingCosts();

    let mortgageAmount = lastFee - capitalAfterSelling;
    if (mortgageAmount < 0) mortgageAmount = 0;

    const monthlyInstallment = this.calculateMonthlyInstallment(
      mortgageAmount,
      this.interestRate(),
      this.termYears()
    );

    return {
      downpayment,
      leftover,
      expectedSelling,
      capitalAfterSelling,
      capitalGainTax,
      attorneyFee,
      lastFee,
      mortgageAmount,
      monthlyInstallment,
    };
  });

  // Detailed mortgage/amortization report (with optional prepayment)
  protected readonly mortgageReport = computed(() => {
    // Delegate simulation to the reusable helper so we can also preview a
    // pending prepayment without duplicating logic.
    const principal = this.results().mortgageAmount;
    const annualPct = this.interestRate();
    const years = this.termYears();
    const entries = this.prepayments();
    return this.simulateMortgage(principal, annualPct, years, entries);
  });

  // Preview of mortgage report if the user had this pending newPrepayment
  // applied (updates live as the newPrepayment* signals change).
  protected readonly pendingMortgageReport = computed(() => {
    const amt = Number(this.newPrepaymentAmount()) || 0;
    if (amt <= 0) {
      // No pending prepayment — return the current mortgageReport to keep UI
      // simple and consistent.
      return this.mortgageReport();
    }

    const fee = Number(this.newPrepaymentFeePercent()) || 0;
    const month = Math.max(
      1,
      Math.floor(Number(this.newPrepaymentMonth()) || 1)
    );
    const effect = this.newPrepaymentEffect();

    const pending: Prepayment = { amount: amt, feePercent: fee, month, effect };

    const principal = this.results().mortgageAmount;
    const annualPct = this.interestRate();
    const years = this.termYears();

    const entries = [...this.prepayments(), pending];
    return this.simulateMortgage(principal, annualPct, years, entries);
  });

  // Reusable simulation helper extracted from mortgageReport. Given a list of
  // prepayments, it runs the amortization loop and returns the same shape as
  // the original mortgageReport computed value.
  private simulateMortgage(
    principal: number,
    annualPct: number,
    years: number,
    entries: Prepayment[]
  ) {
    const monthlyRate = annualPct / 100 / 12;
    const totalMonths = Math.max(1, Math.floor(years * 12));

    // baseline monthly payment (no prepayment)
    const baselineMonthly = this.calculateMonthlyInstallment(
      principal,
      annualPct,
      years
    );

    // Simulation state
    let balance = principal;
    let monthly = baselineMonthly;
    let months = 0;
    let totalPaid = 0;
    let totalInterest = 0;
    let totalFees = 0;

    // Build map of prepayments by month: month -> Prepayment[]
    const prepayMap = new Map<number, Prepayment[]>();
    for (const e of entries) {
      const m = Math.max(1, Math.floor(e.month));
      if (!prepayMap.has(m)) prepayMap.set(m, []);
      prepayMap.get(m)!.push(e);
    }

    // Cap loop to avoid infinite loops
    const cap = Math.max(1000, totalMonths + 1200);

    // Remaining months at any point
    let remainingMonths = totalMonths;

    while (balance > 0.01 && months < cap) {
      months += 1;

      // At the start of each month, apply interest
      const interest = balance * monthlyRate;
      let principalPayment = monthly - interest;
      if (principalPayment < 0) principalPayment = 0;

      // If last payment would overshoot, adjust
      if (principalPayment > balance) {
        principalPayment = balance;
        // final payment equals interest + remaining principal
        const payment = interest + principalPayment;
        totalPaid += payment;
        totalInterest += interest;
        balance = 0;
        break;
      }

      // Normal monthly payment
      balance -= principalPayment;
      totalPaid += monthly;
      totalInterest += interest;
      remainingMonths -= 1;

      // Apply all prepayments scheduled for this month (if any)
      const scheduled = prepayMap.get(months) || [];
      if (scheduled.length > 0) {
        let anyReducePayment = false;
        for (const p of scheduled) {
          const fee = (p.amount * Math.max(0, p.feePercent)) / 100;
          totalFees += fee;
          totalPaid += p.amount + fee;
          balance -= p.amount;
          if (p.effect === 'reducePayment') anyReducePayment = true;
          if (balance <= 0) {
            balance = 0;
            break;
          }
        }

        // After applying scheduled prepayments, adjust monthly if requested
        if (balance > 0 && anyReducePayment) {
          const monthsLeft = Math.max(1, remainingMonths);
          monthly = this.calculateMonthlyInstallment(
            balance,
            annualPct,
            monthsLeft / 12
          );
        }
        if (balance <= 0) break;
      }
    }

    // total paid already includes monthly payments and the prepayment + fee
    const baselineTotalPaid = baselineMonthly * totalMonths;
    const baselineTotalInterest = baselineTotalPaid - principal;

    return {
      principal,
      baselineMonthly,
      baselineTotalPaid,
      baselineTotalInterest,
      monthsUsed: months,
      monthlyAfter: monthly,
      totalPaid,
      totalInterest,
      totalFees,
      interestSaved: Math.max(0, baselineTotalInterest - totalInterest),
      totalSaved: Math.max(0, baselineTotalPaid - totalPaid),
    };
  }

  protected resetForm(): void {
    // Reset signals to their initial defaults
    const defaults = {
      apartmentPrice: 159400000,
      parkingPrice: 8000000,
      storagePrice: 1911000,
      movingCosts: 5000000,

      currentPrice: 98000000,
      currentMortgage: 8300000,

      interestRate: 6.09,
      downpaymentPercent: 0,
      expectedPriceChange: 0,
      yearsToSale: 0,
      currentSavings: 15000000,
      termYears: 30,
      attorneyFeePercent: 0.0,
    };

    this.apartmentPrice.set(defaults.apartmentPrice);
    this.parkingPrice.set(defaults.parkingPrice);
    this.storagePrice.set(defaults.storagePrice);
    this.movingCosts.set(defaults.movingCosts);

    this.currentPrice.set(defaults.currentPrice);
    this.currentMortgage.set(defaults.currentMortgage);

    this.interestRate.set(defaults.interestRate);
    this.downpaymentPercent.set(defaults.downpaymentPercent);
    this.expectedPriceChange.set(defaults.expectedPriceChange);
    this.yearsToSale.set(defaults.yearsToSale);
    this.currentSavings.set(defaults.currentSavings);
    this.termYears.set(defaults.termYears);
    this.attorneyFeePercent.set(defaults.attorneyFeePercent);

    // clear multi-prepayments and add-form defaults
    this.prepayments.set([]);
    this.newPrepaymentAmount.set(0);
    this.newPrepaymentFeePercent.set(0);
    this.newPrepaymentMonth.set(1);
    this.newPrepaymentEffect.set('reducePayment');

    // Also reset the reactive form so the UI matches the signals
    this.form.reset({ ...defaults });
  }

  protected selectInterest(value: number): void {
    // set both the signal and the reactive form control so everything stays in sync
    this.interestRate.set(value);
    const ctrl = this.form.get('interestRate');
    if (ctrl) ctrl.setValue(value);
  }

  protected selectExpectedPriceChange(value: number): void {
    this.expectedPriceChange.set(value);
    const ctrl = this.form.get('expectedPriceChange');
    if (ctrl) ctrl.setValue(value);
  }

  protected selectAttorneyFee(value: number): void {
    this.attorneyFeePercent.set(value);
    const ctrl = this.form.get('attorneyFeePercent');
    if (ctrl) ctrl.setValue(value);
  }

  protected formatCurrency(value: number): string {
    if (value === null || value === undefined) return '—';
    try {
      return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        maximumFractionDigits: 0,
      }).format(Math.round(value));
    } catch (e) {
      return Math.round(value).toLocaleString() + ' Ft';
    }
  }

  private calculateMonthlyInstallment(
    principal: number,
    annualPct: number,
    years: number
  ): number {
    if (!principal || principal <= 0) return 0;
    const n = Math.max(1, Math.floor(years * 12));
    const r = annualPct / 100 / 12;
    if (r === 0) return principal / n;
    const payment = (r * principal) / (1 - Math.pow(1 + r, -n));
    return payment;
  }
}
