// Apartment buying calculator logic

function $(id){return document.getElementById(id)}

function parseFloatSafe(id){
  // Accept formatted values like "1 000 000 Ft" or plain numbers
  const el = $(id);
  if(!el) return 0;
  const raw = String(el.value || '');
  const cleaned = raw.replace(/[^\d.\-]/g, ''); // strip spaces, Ft, thousands separators
  const v = parseFloat(cleaned);
  return isFinite(v) ? v : 0;
}

function unformatNumberString(s){
  if(s === null || s === undefined) return '';
  return String(s).replace(/[^\d.\-]/g, '');
}

function formatInputMoneyElement(el){
  if(!el) return;
  const cleaned = unformatNumberString(el.value);
  const n = cleaned === '' ? 0 : Number(cleaned);
  try{
    el.value = new Intl.NumberFormat('hu-HU', {maximumFractionDigits: 0}).format(Math.round(n)) + ' Ft';
  } catch(e){
    el.value = Math.round(n).toLocaleString() + ' Ft';
  }
}

function formatCurrency(n){
  if (n===null || n===undefined) return '—';
  // Format as Hungarian Forint with 'Ft' suffix, no decimals
  try{
    return new Intl.NumberFormat('hu-HU', {style: 'currency', currency: 'HUF', maximumFractionDigits: 0}).format(Math.round(n));
  } catch(e){
    // fallback
    return Math.round(n).toLocaleString() + ' Ft';
  }
}

function calculate(){
  // Inputs
  const apartment = parseFloatSafe('apartmentPrice');
  const parking = parseFloatSafe('parkingPrice');
  const storage = parseFloatSafe('storagePrice');
  const furniture = parseFloatSafe('furniturePrice');

  const currentPrice = parseFloatSafe('currentPrice');
  const currentMortgage = parseFloatSafe('currentMortgage');

  const interestRatePct = parseFloatSafe('interestRate'); // annual % for loan
  const savings = parseFloatSafe('currentSavings');
  const termYears = parseFloatSafe('termYears');

  // Combined prices
  const totalApartmentPrice = apartment + parking + storage;

  // Downpayment 10%
  const downpayment = totalApartmentPrice * 0.10;

  // Leftover amount
  const leftover = totalApartmentPrice - downpayment;

  // Expected real estate price change annual % (from input; default 2%)
  const expectedPriceChangeEl = document.getElementById('expectedPriceChange');
  let expectedChangePct = 2.0;
  if(expectedPriceChangeEl){ expectedChangePct = parseFloatSafe('expectedPriceChange'); }
  const expectedChange = expectedChangePct / 100;

  // Expected selling price after a configurable number of years (compound)
  let years = 1.5;
  const yearsEl = document.getElementById('yearsToSale');
  if (yearsEl) years = parseFloatSafe('yearsToSale') || years;
  const expectedSellingPrice = currentPrice * Math.pow(1 + expectedChange, years);

  // Capital after selling = expected selling price - current mortgage + current savings
  const capitalAfterSelling = expectedSellingPrice - currentMortgage + savings;

  // Capital gain tax (4%) on profit of selling old apartment (expected selling price - current price)
  const profit = totalApartmentPrice - expectedSellingPrice;
  const capitalGainTax = Math.max(0, profit) * 0.04;

  // Attorney's fee (0.7%)
  const attorneyFee = totalApartmentPrice * 0.007;

  // Apartment last fee: leftover plus taxes/fees (capitalGainTax and attorneyFee added to leftover)
  const lastFee = leftover + capitalGainTax + attorneyFee + furniture;

  // Mortgage amount (needed) = last fee - capital after selling
  let mortgageAmount = lastFee - capitalAfterSelling;
  // If capitalAfterSelling covers more than leftover, mortgage needed is zero (or negative -> 0)
  if(mortgageAmount < 0) mortgageAmount = 0;

  // Monthly installment (use interestRatePct as the loan interest)
  const monthlyInstallment = calcMonthlyInstallment(mortgageAmount, interestRatePct, termYears);

  // Update DOM
  $('downpayment').textContent = formatCurrency(round2(downpayment));
  $('leftover').textContent = formatCurrency(round2(leftover));
  $('expectedSelling').textContent = formatCurrency(round2(expectedSellingPrice));
  $('capitalAfterSelling').textContent = formatCurrency(round2(capitalAfterSelling));
  $('capitalGainTax').textContent = formatCurrency(round2(capitalGainTax));
  $('attorneyFee').textContent = formatCurrency(round2(attorneyFee));
  $('lastFee').textContent = formatCurrency(round2(lastFee));
  $('mortgageAmount').textContent = formatCurrency(round2(mortgageAmount));
  $('monthlyInstallment').textContent = formatCurrency(round2(monthlyInstallment));
}

function round2(n){return Math.round((n+Number.EPSILON)*100)/100}

function calcMonthlyInstallment(principal, annualPct, years){
  if(!principal || principal <= 0) return 0;
  const n = Math.max(1, Math.floor(years * 12));
  const r = (annualPct / 100) / 12; // monthly rate
  if(r === 0) return principal / n;
  const payment = (r * principal) / (1 - Math.pow(1 + r, -n));
  return payment;
}

function resetForm(){
  document.getElementById('calcForm').reset();
  // set default values back to sensible defaults
  $('apartmentPrice').value = 202500000;
  $('parkingPrice').value = 7500000;
  $('storagePrice').value = 0;
  $('furniturePrice').value = 3000000;
  $('currentPrice').value = 105000000;
  $('currentMortgage').value = 7000000;
  $('interestRate').value = 6;
  $('expectedPriceChange').value = 7;
  $('yearsToSale').value = 1.5;
  $('currentSavings').value = 5000000;
  $('termYears').value = 30;

  // Format money inputs so they show with separators and Ft suffix
  Array.from(document.querySelectorAll('input.money')).forEach(formatInputMoneyElement);

  // Clear outputs
  ['downpayment','leftover','expectedSelling','capitalAfterSelling','capitalGainTax','attorneyFee','lastFee','mortgageAmount','monthlyInstallment']
    .forEach(id => $(id).textContent = '—');
}

// Attach events
window.addEventListener('DOMContentLoaded', ()=>{
  $('calculateBtn').addEventListener('click', ()=>{
    calculate();
  });
  $('resetBtn').addEventListener('click', ()=>{
    resetForm();
  });

  // Also calculate on enter or when changing important inputs (small UX)
  const inputs = Array.from(document.querySelectorAll('#calcForm input'));
  inputs.forEach(i => i.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') calculate();
  }));

  // Money inputs: format on blur, unformat on focus, basic cleanup on input
  const moneyInputs = Array.from(document.querySelectorAll('input.money'));
  moneyInputs.forEach(inp => {
    inp.addEventListener('focus', (e) => {
      // remove formatting so user can edit raw number
      e.target.value = unformatNumberString(e.target.value);
      // move caret to end
      setTimeout(()=>{ e.target.selectionStart = e.target.selectionEnd = e.target.value.length; }, 0);
    });
    inp.addEventListener('input', (e) => {
      // allow only digits, dot and minus while typing
      const cleaned = unformatNumberString(e.target.value);
      e.target.value = cleaned;
    });
    inp.addEventListener('blur', (e) => {
      // format nicely
      formatInputMoneyElement(e.target);
    });
  });

  // Pre-fill defaults and calculate once
  resetForm();
  calculate();
});