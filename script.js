const money = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 2
});

const numberFmt = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 2 });
const percentFmt = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 1 });

const state = {
  step: 0,
  ingredients: [
    { id: crypto.randomUUID(), name: "กะทิ", purchasePrice: 80, purchaseAmount: 1000, usedAmount: 700, unit: "มล." }
  ],
  packaging: [{ id: crypto.randomUUID(), name: "กล่อง", pricePerPiece: 4, quantityPerUnit: 1 }]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const positive = (value) => (Number.isFinite(Number(value)) && Number(value) > 0 ? Number(value) : 0);

function formatMoney(value) {
  return money.format(Number.isFinite(value) ? value : 0).replace(".00", "");
}

function formatPercent(value) {
  return `${percentFmt.format(Number.isFinite(value) ? value : 0)}%`;
}

function roundFriendly(value) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  const rounded = Math.ceil(value);
  const base = Math.floor(rounded / 10) * 10;
  return [base + 5, base + 9, base + 15, base + 19].find((price) => price >= rounded) || rounded;
}

function getFormState() {
  const sellingUnitName = $("#sellingUnitName").value.trim() || "กล่อง";
  const innerUnitName = $("#innerUnitName").value.trim() || "ชิ้น";
  const piecesPerSellingUnit = positive($("#piecesPerSellingUnit").value);
  const plannedSellingUnits = positive($("#plannedSellingUnits").value);
  const totalPiecesNeeded = piecesPerSellingUnit * plannedSellingUnits;
  const estimatedRecipeYield = positive($("#estimatedRecipeYield").value);
  const batchMultiplier = estimatedRecipeYield > 0 ? Math.ceil(totalPiecesNeeded / estimatedRecipeYield) : 0;
  const ingredientSimple = $("#ingredientSimple").checked;
  const packagingSimple = $("#packagingSimple").checked;
  const overhead = $('input[name="overhead"]:checked').value;
  return {
    menuName: $("#menuName").value.trim() || "เมนูของฉัน",
    sellingUnitName,
    innerUnitName,
    piecesPerSellingUnit,
    plannedSellingUnits,
    totalPiecesNeeded,
    estimatedRecipeYield,
    batchMultiplier,
    ingredientSimple,
    ingredientManual: positive($("#ingredientManual").value),
    packagingSimple,
    packagingManual: positive($("#packagingManual").value),
    overhead,
    overheadCustom: positive($("#overheadCustom").value),
    sellingPrice: positive($("#sellingPrice").value)
  };
}

function calculate() {
  const form = getFormState();
  const ingredientCost = form.ingredientSimple
    ? form.ingredientManual
    : state.ingredients.reduce((sum, item) => {
        const purchaseAmount = positive(item.purchaseAmount);
        if (!purchaseAmount) return sum;
        return sum + (positive(item.purchasePrice) / purchaseAmount) * positive(item.usedAmount);
      }, 0);
  const packagingPerUnit = form.packagingSimple
    ? form.packagingManual
    : state.packaging.reduce(
        (sum, item) => sum + positive(item.pricePerPiece) * positive(item.quantityPerUnit),
        0
      );
  const packagingTotal = packagingPerUnit * form.plannedSellingUnits;
  const baseOverhead = ingredientCost + packagingTotal;
  const overheadTotal =
    form.overhead === "percent10"
      ? baseOverhead * 0.1
      : form.overhead === "percent15"
        ? baseOverhead * 0.15
        : form.overhead === "custom"
          ? form.overheadCustom
          : 0;
  const totalCost = ingredientCost + packagingTotal + overheadTotal;
  const costPerPiece = form.totalPiecesNeeded > 0 ? totalCost / form.totalPiecesNeeded : 0;
  const costPerSellingUnit = costPerPiece * form.piecesPerSellingUnit;
  const profitPerSellingUnit = form.sellingPrice - costPerSellingUnit;
  const totalRevenue = form.sellingPrice * form.plannedSellingUnits;
  const totalProfit = profitPerSellingUnit * form.plannedSellingUnits;
  const profitMargin = form.sellingPrice > 0 ? (profitPerSellingUnit / form.sellingPrice) * 100 : 0;
  const markup = costPerSellingUnit > 0 ? (profitPerSellingUnit / costPerSellingUnit) * 100 : 0;
  const suggestions = [
    ["ราคาขั้นต่ำ", "พอมีเผื่อกำไร แต่ยังไม่ควรต่ำกว่านี้", 1.3],
    ["ราคาคุ้มแรง", "เหมาะกับการขายจริงสำหรับมือใหม่", 1.7],
    ["ราคาพรีเมียม", "เหมาะกับแพ็กเกจสวย วัตถุดิบดี หรือขายเป็นของฝาก", 2]
  ].map(([label, description, multiplier]) => ({
    label,
    description,
    price: roundFriendly(costPerSellingUnit * multiplier)
  }));

  return {
    ...form,
    ingredientCost,
    packagingPerUnit,
    packagingTotal,
    overheadTotal,
    totalCost,
    costPerPiece,
    costPerSellingUnit,
    profitPerSellingUnit,
    totalRevenue,
    totalProfit,
    profitMargin,
    markup,
    suggestions
  };
}

function renderIngredients() {
  $("#ingredients").innerHTML = state.ingredients
    .map(
      (item, index) => `
        <article class="item" data-id="${item.id}">
          <div class="item__head">
            <span>วัตถุดิบ #${index + 1}</span>
            <button class="btn btn--danger" type="button" data-remove-ingredient="${item.id}">ลบ</button>
          </div>
          <div class="grid grid--two">
            ${field(`ingredient-name-${item.id}`, "ชื่อวัตถุดิบ", item.name, "เช่น กะทิ", "text", `data-ingredient="${item.id}" data-key="name"`)}
            ${field(`ingredient-price-${item.id}`, "ราคาที่ซื้อมา", item.purchasePrice, "", "number", `data-ingredient="${item.id}" data-key="purchasePrice"`)}
            ${field(`ingredient-purchase-${item.id}`, "ปริมาณที่ซื้อมา", item.purchaseAmount, "", "number", `data-ingredient="${item.id}" data-key="purchaseAmount"`)}
            ${field(`ingredient-used-${item.id}`, "ปริมาณที่จะใช้ในสูตรนี้", item.usedAmount, "", "number", `data-ingredient="${item.id}" data-key="usedAmount"`)}
            ${field(`ingredient-unit-${item.id}`, "หน่วย", item.unit, "กรัม", "text", `data-ingredient="${item.id}" data-key="unit"`)}
          </div>
          <div class="item__cost" id="ingredient-cost-${item.id}">ต้นทุนรายการนี้ ${formatMoney(item.purchaseAmount ? (positive(item.purchasePrice) / positive(item.purchaseAmount)) * positive(item.usedAmount) : 0)}</div>
        </article>
      `
    )
    .join("");
}

function renderPackaging() {
  const form = getFormState();
  $("#packaging").innerHTML = state.packaging
    .map(
      (item, index) => `
        <article class="item" data-id="${item.id}">
          <div class="item__head">
            <span>แพ็กเกจ #${index + 1}</span>
            <button class="btn btn--danger" type="button" data-remove-packaging="${item.id}">ลบ</button>
          </div>
          <div class="grid grid--two">
            ${field(`packaging-name-${item.id}`, "ชื่อแพ็กเกจ", item.name, ["กล่อง", "ถ้วยพร้อมฝา", "สติกเกอร์", "ถุงหิ้ว"][index % 4], "text", `data-packaging="${item.id}" data-key="name"`)}
            ${field(`packaging-price-${item.id}`, "ราคาต่อชิ้น", item.pricePerPiece, "", "number", `data-packaging="${item.id}" data-key="pricePerPiece"`)}
            ${field(`packaging-qty-${item.id}`, `จำนวนที่ใช้ต่อ 1 ${form.sellingUnitName}`, item.quantityPerUnit, "", "number", `data-packaging="${item.id}" data-key="quantityPerUnit"`)}
          </div>
          <div class="item__cost" id="packaging-cost-${item.id}">ต้นทุนต่อ${form.sellingUnitName} ${formatMoney(positive(item.pricePerPiece) * positive(item.quantityPerUnit))}</div>
        </article>
      `
    )
    .join("");
}

function field(id, label, value, placeholder, type, dataAttrs) {
  return `
    <label for="${id}">
      <span>${label}</span>
      <input id="${id}" type="${type}" min="0" inputmode="decimal" value="${value ?? ""}" placeholder="${placeholder}" ${dataAttrs} />
    </label>
  `;
}

function statusFor(result) {
  if (result.piecesPerSellingUnit <= 0 || result.plannedSellingUnits <= 0 || result.sellingPrice <= 0) {
    return ["ยังกรอกไม่ครบ", "กรอกแผนจำนวนที่จะขายและราคาขายก่อน ระบบจึงจะลองคำนวณกำไรได้ครบ", "warning"];
  }
  if (result.profitPerSellingUnit < 0) {
    return ["แผนนี้อาจขาดทุน", "ราคานี้ยังต่ำกว่าต้นทุนโดยประมาณ ลองปรับราคาขายหรือกลับไปลดต้นทุนก่อน", "error"];
  }
  if (result.profitMargin < 25) {
    return ["กำไรยังบาง", "ถ้าขายหมดจะมีกำไร แต่กำไรอาจยังไม่คุ้มแรง ลองดูราคาคุ้มแรงที่ระบบแนะนำ", "warning"];
  }
  return ["น่าลองคำนวณต่อ", "จากตัวเลขประมาณการ เมนูนี้มีโอกาสทำกำไรได้ ลองใช้แผนนี้ตัดสินใจก่อนซื้อของ", "success"];
}

function render() {
  const result = calculate();
  const [status, message, tone] = statusFor(result);

  $$(".page").forEach((page) => page.classList.toggle("is-active", Number(page.dataset.page) === state.step));
  $$(".step").forEach((step) => step.classList.toggle("is-active", Number(step.dataset.step) === state.step));
  $("#backButton").disabled = state.step === 0;
  $("#nextButton").disabled = state.step === 6;
  $("#resultCard").classList.toggle("is-hidden", state.step !== 6);

  $("#piecesPerSellingUnitLabel").textContent = `1 ${result.sellingUnitName}มีขนมกี่${result.innerUnitName}`;
  $("#plannedSellingUnitsLabel").textContent = `รอบนี้อยากลองขายกี่${result.sellingUnitName}`;
  $("#estimatedRecipeYieldLabel").textContent = `จากสูตรนี้ คาดว่าจะได้ประมาณกี่${result.innerUnitName}`;
  $("#planSummary").textContent = `ถ้าขาย ${numberFmt.format(result.plannedSellingUnits)} ${result.sellingUnitName} ${result.sellingUnitName}ละ ${numberFmt.format(result.piecesPerSellingUnit)} ${result.innerUnitName} คุณต้องเตรียมทั้งหมด ${numberFmt.format(result.totalPiecesNeeded)} ${result.innerUnitName}`;
  $("#batchSummary").textContent = `จากแผนนี้ คุณต้องเตรียมทั้งหมด ${numberFmt.format(result.totalPiecesNeeded)} ${result.innerUnitName} ถ้าสูตรนี้ทำได้ประมาณ ${numberFmt.format(result.estimatedRecipeYield)} ${result.innerUnitName}ต่อรอบ คุณต้องทำประมาณ ${numberFmt.format(result.batchMultiplier)} รอบสูตร`;
  $("#batchSummary").classList.toggle("is-hidden", result.estimatedRecipeYield <= 0);
  $("#recipeYieldNote").classList.toggle("is-hidden", result.estimatedRecipeYield > 0);
  $("#sellingPriceLabel").textContent = `ราคาขายต่อ${result.sellingUnitName}`;
  $("#costHint").textContent = `ต้นทุนต่อ${result.sellingUnitName}ตอนนี้คือ ${formatMoney(result.costPerSellingUnit)}`;
  $("#plannedQuantityWarning").classList.toggle("is-hidden", result.piecesPerSellingUnit > 0 && result.plannedSellingUnits > 0);
  $("#lossWarning").classList.toggle("is-hidden", !(result.sellingPrice > 0 && result.sellingPrice < result.costPerSellingUnit));

  $("#ingredientDetailed").classList.toggle("is-hidden", result.ingredientSimple);
  $("#ingredientSimpleBox").classList.toggle("is-hidden", !result.ingredientSimple);
  $("#packagingDetailed").classList.toggle("is-hidden", result.packagingSimple);
  $("#packagingSimpleBox").classList.toggle("is-hidden", !result.packagingSimple);
  $("#overheadCustomBox").classList.toggle("is-hidden", result.overhead !== "custom");

  $("#ingredientTotal").textContent = formatMoney(result.ingredientCost);
  $("#packagingManualLabel").textContent = `ต้นทุนแพ็กเกจต่อ${result.sellingUnitName}`;
  $("#packagingPerUnitLabel").textContent = `แพ็กเกจต่อ${result.sellingUnitName}`;
  $("#packagingPerUnit").textContent = formatMoney(result.packagingPerUnit);
  $("#packagingTotal").textContent = formatMoney(result.packagingTotal);
  $("#overheadTotal").textContent = formatMoney(result.overheadTotal);

  $("#resultMenu").textContent = result.menuName;
  $("#resultPlan").textContent = `วางแผนขาย ${numberFmt.format(result.plannedSellingUnits)} ${result.sellingUnitName}`;
  $("#statusLabel").textContent = status;
  $("#statusLabel").className = `status ${tone === "success" ? "is-success" : tone === "error" ? "is-error" : ""}`;
  $("#statusMessage").textContent = message;

  $("#resultPiecesPerUnitText").textContent = `1 ${result.sellingUnitName}มี`;
  $("#resultPiecesPerUnit").textContent = `${numberFmt.format(result.piecesPerSellingUnit)} ${result.innerUnitName}`;
  $("#resultPlannedUnitsText").textContent = "วางแผนขาย";
  $("#resultPlannedUnits").textContent = `${numberFmt.format(result.plannedSellingUnits)} ${result.sellingUnitName}`;
  $("#resultTotalPieces").textContent = `${numberFmt.format(result.totalPiecesNeeded)} ${result.innerUnitName}`;
  $("#resultBatchMultiplier").textContent = `ประมาณ ${numberFmt.format(result.batchMultiplier)} รอบสูตร`;
  $("#resultBatchBox").classList.toggle("is-hidden", result.estimatedRecipeYield <= 0);
  $("#resultRecipeYieldNote").textContent =
    result.estimatedRecipeYield > 0
      ? `ถ้าสูตรนี้ได้ประมาณ ${numberFmt.format(result.estimatedRecipeYield)} ${result.innerUnitName}ต่อรอบ ต้องทำประมาณ ${numberFmt.format(result.batchMultiplier)} รอบสูตร`
      : "ยังไม่ได้คำนวณจำนวนรอบสูตร เพราะยังไม่ได้ใส่จำนวนที่สูตรคาดว่าจะได้";
  $("#totalCost").textContent = formatMoney(result.totalCost);
  $("#costPerPieceText").textContent = `ต้นทุนต่อ${result.innerUnitName}ประมาณ`;
  $("#costPerPiece").textContent = formatMoney(result.costPerPiece);
  $("#costPerSellingUnitText").textContent = `ต้นทุนต่อ${result.sellingUnitName}ประมาณ`;
  $("#costPerSellingUnit").textContent = formatMoney(result.costPerSellingUnit);
  $("#sellingText").textContent = `ราคาขายต่อ${result.sellingUnitName}`;
  $("#sellingValue").textContent = formatMoney(result.sellingPrice);
  $("#profitText").textContent = `กำไรต่อ${result.sellingUnitName}ประมาณ`;
  $("#profitPerSellingUnit").textContent = formatMoney(result.profitPerSellingUnit);
  $("#totalRevenue").textContent = formatMoney(result.totalRevenue);
  $("#totalProfit").textContent = formatMoney(result.totalProfit);
  $("#profitMargin").textContent = formatPercent(result.profitMargin);
  $("#markup").textContent = formatPercent(result.markup);

  const suggestionsHtml = result.suggestions
    .map(
      (item) => `
        <button class="suggestion-btn" type="button" data-use-price="${item.price}">
          <span>${item.label}</span>
          <strong>${formatMoney(item.price)}</strong>
          <small>แตะเพื่อใช้ราคานี้</small>
        </button>
      `
    )
    .join("");
  $("#suggestionButtons").innerHTML = suggestionsHtml;
  $("#priceCards").innerHTML = result.suggestions
    .map(
      (item) => `
        <article class="price-card">
          <span>${item.label}</span>
          <strong>${formatMoney(item.price)}</strong>
          <small>${item.description}</small>
        </article>
      `
    )
    .join("");
}

function bindEvents() {
  $("#startButton").addEventListener("click", () => {
    $("#hero").classList.add("is-hidden");
    $("#calculator").classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#readyButton").addEventListener("click", () => {
    $("#prepCard").classList.add("is-hidden");
    $("#wizardArea").classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });

  $("#backButton").addEventListener("click", () => {
    state.step = Math.max(0, state.step - 1);
    render();
  });

  $("#nextButton").addEventListener("click", () => {
    state.step = Math.min(6, state.step + 1);
    render();
  });

  $$(".step").forEach((step) =>
    step.addEventListener("click", () => {
      state.step = Number(step.dataset.step);
      render();
    })
  );

  $("#cookbossForm").addEventListener("input", (event) => {
    const input = event.target;
    if (input.dataset.ingredient) {
      const item = state.ingredients.find((row) => row.id === input.dataset.ingredient);
      item[input.dataset.key] = input.type === "number" ? positive(input.value) : input.value;
      const costTarget = $(`#ingredient-cost-${item.id}`);
      if (costTarget) {
        const purchaseAmount = positive(item.purchaseAmount);
        const itemCost = purchaseAmount ? (positive(item.purchasePrice) / purchaseAmount) * positive(item.usedAmount) : 0;
        costTarget.textContent = `ต้นทุนรายการนี้ ${formatMoney(itemCost)}`;
      }
    }
    if (input.dataset.packaging) {
      const item = state.packaging.find((row) => row.id === input.dataset.packaging);
      item[input.dataset.key] = input.type === "number" ? positive(input.value) : input.value;
      const form = getFormState();
      const costTarget = $(`#packaging-cost-${item.id}`);
      if (costTarget) {
        costTarget.textContent = `ต้นทุนต่อ${form.sellingUnitName} ${formatMoney(positive(item.pricePerPiece) * positive(item.quantityPerUnit))}`;
      }
    }
    if (input.id === "sellingUnitName") {
      renderPackaging();
    }
    render();
  });

  $("#cookbossForm").addEventListener("change", render);

  $("#addIngredient").addEventListener("click", () => {
    state.ingredients.push({ id: crypto.randomUUID(), name: "", purchasePrice: 0, purchaseAmount: 0, usedAmount: 0, unit: "กรัม" });
    renderIngredients();
    render();
  });

  $("#addPackaging").addEventListener("click", () => {
    state.packaging.push({ id: crypto.randomUUID(), name: "", pricePerPiece: 0, quantityPerUnit: 1 });
    renderPackaging();
    render();
  });

  $("#skipRecipeYield").addEventListener("click", () => {
    $("#estimatedRecipeYield").value = "";
    render();
  });

  document.addEventListener("click", (event) => {
    const ingredientId = event.target.dataset.removeIngredient;
    const packagingId = event.target.dataset.removePackaging;
    const usePrice = event.target.closest("[data-use-price]")?.dataset.usePrice;
    if (ingredientId) {
      state.ingredients = state.ingredients.filter((item) => item.id !== ingredientId);
      renderIngredients();
      render();
    }
    if (packagingId) {
      state.packaging = state.packaging.filter((item) => item.id !== packagingId);
      renderPackaging();
      render();
    }
    if (usePrice) {
      $("#sellingPrice").value = usePrice;
      render();
    }
  });

  $("#resetButton").addEventListener("click", () => {
    location.reload();
  });

  $("#exportButton").addEventListener("click", exportPng);
}

async function exportPng() {
  const result = calculate();
  if (result.piecesPerSellingUnit <= 0 || result.plannedSellingUnits <= 0 || result.sellingPrice <= 0) {
    alert("กรุณากรอกแผนจำนวนที่จะขายและราคาขายก่อนบันทึกแผนเป็นรูปภาพ");
    return;
  }
  const [status, message, tone] = statusFor(result);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#F7F1E5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#12372A";
  ctx.fillRect(0, 0, canvas.width, 210);
  ctx.fillStyle = "#C8A45D";
  ctx.fillRect(70, 190, 940, 8);
  drawText(ctx, "CookBoss", 70, 95, 52, "#FFFFFF", "900");
  drawText(ctx, "กำไรขนมไทย", 70, 150, 32, "#F6EAD0", "700");
  ctx.fillStyle = tone === "success" ? "#E8F5EC" : tone === "error" ? "#FFEBE8" : "#FFF4DB";
  roundRect(ctx, 690, 70, 300, 72, 36);
  ctx.fill();
  drawText(ctx, status, 840, 117, 30, tone === "success" ? "#2F7D4F" : tone === "error" ? "#B9473A" : "#B8872D", "900", "center");
  drawText(ctx, "จากแผนนี้ ถ้าขายหมด คุณจะได้ประมาณ...", 70, 290, 30, "#6B5E4A", "800");
  drawText(ctx, result.menuName.slice(0, 26), 70, 365, 68, "#12372A", "900");
  drawText(ctx, `วางแผนขาย ${numberFmt.format(result.plannedSellingUnits)} ${result.sellingUnitName}`, 70, 425, 30, "#6B5E4A", "700");
  drawText(ctx, `1 ${result.sellingUnitName}มี ${numberFmt.format(result.piecesPerSellingUnit)} ${result.innerUnitName} ต้องเตรียมทั้งหมด ${numberFmt.format(result.totalPiecesNeeded)} ${result.innerUnitName}`, 70, 470, 26, "#6B5E4A", "700");
  if (result.estimatedRecipeYield > 0) {
    drawText(ctx, `ต้องทำประมาณ ${numberFmt.format(result.batchMultiplier)} รอบสูตร`, 70, 510, 26, "#B8872D", "800");
  } else {
    drawText(ctx, "ยังไม่ได้คำนวณจำนวนรอบสูตร เพราะยังไม่ได้ใส่จำนวนที่สูตรคาดว่าจะได้", 70, 510, 24, "#6B5E4A", "700");
  }
  const cards = [
    [`ต้นทุนต่อ${result.innerUnitName}ประมาณ`, formatMoney(result.costPerPiece)],
    [`ต้นทุนต่อ${result.sellingUnitName}ประมาณ`, formatMoney(result.costPerSellingUnit)],
    [`ราคาขายต่อ${result.sellingUnitName}`, formatMoney(result.sellingPrice)],
    [`กำไรต่อ${result.sellingUnitName}ประมาณ`, formatMoney(result.profitPerSellingUnit)],
    ["ต้นทุนรวมประมาณ", formatMoney(result.totalCost)],
    ["กำไรรวมถ้าขายหมดประมาณ", formatMoney(result.totalProfit)]
  ];
  cards.forEach((card, index) => {
    const x = 70 + (index % 2) * 480;
    const y = 550 + Math.floor(index / 2) * 145;
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, x, y, 430, 115, 16);
    ctx.fill();
    ctx.strokeStyle = "rgba(200,164,93,.55)";
    ctx.stroke();
    drawText(ctx, card[0], x + 32, y + 35, 24, "#6B5E4A", "800");
    drawText(ctx, card[1], x + 32, y + 82, 38, "#12372A", "900");
  });
  ctx.fillStyle = "#12372A";
  roundRect(ctx, 70, 1000, 940, 110, 16);
  ctx.fill();
  drawText(ctx, message, 100, 1040, 28, "#FFFFFF", "900");
  drawText(ctx, `เปอร์เซ็นต์กำไรประมาณ ${formatPercent(result.profitMargin)}`, 100, 1080, 24, "#F6EAD0", "700");
  result.suggestions.forEach((item, index) => {
    const x = 70 + index * 320;
    ctx.fillStyle = "#FFF8E8";
    roundRect(ctx, x, 1100, 290, 130, 16);
    ctx.fill();
    ctx.strokeStyle = "#C8A45D";
    ctx.stroke();
    drawText(ctx, item.label, x + 24, 1145, 25, "#12372A", "900");
    drawText(ctx, formatMoney(item.price), x + 24, 1205, 42, "#B8872D", "900");
  });
  drawText(ctx, "คำนวณด้วย CookBoss กำไรขนมไทย", 540, 1290, 26, "#6B5E4A", "800", "center");

  canvas.toBlob(async (blob) => {
    const file = new File([blob], `cookboss-${result.menuName}.png`, { type: "image/png" });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ title: "CookBoss กำไรขนมไทย", files: [file] });
      return;
    }
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = file.name;
    link.click();
    URL.revokeObjectURL(link.href);
  }, "image/png");
}

function drawText(ctx, text, x, y, size, color, weight = "400", align = "left") {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y, 900);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

renderIngredients();
renderPackaging();
bindEvents();
render();
