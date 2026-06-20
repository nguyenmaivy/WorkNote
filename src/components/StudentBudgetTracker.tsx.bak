import React, { useState, useEffect } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { 
  PiggyBank, 
  Wallet, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Sparkles, 
  Filter, 
  Calendar, 
  Tag, 
  CheckCircle2, 
  CircleDollarSign, 
  Award,
  BookOpen,
  Info,
  DollarSign
} from "lucide-react";

// Standardizing structural types for Student Tracker
interface Transaction {
  id: string;
  title: string;
  category: "study_material" | "course_tuition" | "living_food" | "housing_bills" | "entertainment" | "other";
  amount: number;
  date: string;
  type: "expense" | "income";
  notes?: string;
}

interface SavingGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
}

// Categories translations and colors
const CATEGORY_MAP: Record<string, { label: string; color: string; bg: string }> = {
  study_material: { label: "Sách & Đồ dùng học tập", color: "text-blue-600 border-blue-200", bg: "bg-blue-50" },
  course_tuition: { label: "Học phí & Khóa học", color: "text-indigo-600 border-indigo-200", bg: "bg-indigo-50" },
  living_food: { label: "Ăn uống & Sinh hoạt", color: "text-emerald-600 border-emerald-200", bg: "bg-emerald-50" },
  housing_bills: { label: "Nhà ở & Tiền điện nước", color: "text-amber-600 border-amber-200", bg: "bg-amber-50" },
  entertainment: { label: "Giải trí & Công nghệ", color: "text-rose-600 border-rose-200", bg: "bg-rose-50" },
  other: { label: "Chi phí khác", color: "text-slate-600 border-slate-200", bg: "bg-slate-50" }
};

// --- Quick Templates Data Structure ---
interface QuickTemplate {
  title: string;
  category: "study_material" | "course_tuition" | "living_food" | "housing_bills" | "entertainment" | "other";
  suggestedAmount: number;
  icon: string;
}

const TEMPLATE_LISTS: Record<"learning" | "living" | "bills" | "entertainment", { label: string; icon: string; templates: QuickTemplate[] }> = {
  learning: {
    label: "📚 Học Tập",
    icon: "📚",
    templates: [
      { title: "Sách giáo trình / Tài liệu tham khảo", category: "study_material", suggestedAmount: 120000, icon: "📖" },
      { title: "Photocopy / In ấn đề cương ôn tập", category: "study_material", suggestedAmount: 25000, icon: "🖨️" },
      { title: "Bút bi & Vở ghi chép mới", category: "study_material", suggestedAmount: 15000, icon: "✏️" },
      { title: "Đăng ký Khóa học kỹ năng ngắn hạn", category: "course_tuition", suggestedAmount: 450000, icon: "🎓" },
    ]
  },
  living: {
    label: "🍲 Sinh Hoạt",
    icon: "🍲",
    templates: [
      { title: "Suất cơm trưa Canteen trường", category: "living_food", suggestedAmount: 35000, icon: "🍚" },
      { title: "Cà phê học bài kéo dài", category: "living_food", suggestedAmount: 40000, icon: "☕" },
      { title: "Nhu yếu phẩm / Đi siêu thị tuần", category: "living_food", suggestedAmount: 200000, icon: "🛒" },
      { title: "Trà sữa / Ăn vặt tối nhóm", category: "living_food", suggestedAmount: 45000, icon: "🧋" },
    ]
  },
  bills: {
    label: "🔌 Nhà Cửa & Di Chuyển",
    icon: "🔌",
    templates: [
      { title: "Đăng ký gói cước 4G / Nạp điện thoại", category: "housing_bills", suggestedAmount: 90000, icon: "📱" },
      { title: "Đổ xăng xe máy di chuyển tuần", category: "housing_bills", suggestedAmount: 50000, icon: "🛵" },
      { title: "Tiền thuê trọ chung / Ký túc xá", category: "housing_bills", suggestedAmount: 1500000, icon: "🏠" },
      { title: "Tiền điện nước điện thoại dùng chung", category: "housing_bills", suggestedAmount: 250000, icon: "⚡" },
    ]
  },
  entertainment: {
    label: "🎮 Giải Trí & Cá Nhân",
    icon: "🎮",
    templates: [
      { title: "Vé xem phim rạp cuối tuần", category: "entertainment", suggestedAmount: 110000, icon: "🍿" },
      { title: "Nâng cấp Chuột / Bàn phím / Tai nghe", category: "entertainment", suggestedAmount: 350000, icon: "🖱️" },
      { title: "Món quà sinh nhật bạn thân", category: "entertainment", suggestedAmount: 200000, icon: "🎁" },
      { title: "Đăng ký Spotify / Netflix dùng chung", category: "entertainment", suggestedAmount: 59000, icon: "🎵" },
    ]
  }
};

export default function StudentBudgetTracker() {
  // --- Persistent States ---
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem("vietlearn_transactions");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse transactions", err);
      }
    }
    // Default initial transactions for visual satisfaction
    return [
      {
        id: "t1",
        title: "Giáo trình IELTS Mindset 2",
        category: "study_material",
        amount: 250000,
        date: "2026-06-10",
        type: "expense",
        notes: "Nhà sách Nguyễn Văn Cừ"
      },
      {
        id: "t2",
        title: "Làm thêm gia sư tiếng Anh",
        category: "other",
        amount: 1500000,
        date: "2026-06-05",
        type: "income",
        notes: "Lương dạy kèm tuần 1"
      },
      {
        id: "t3",
        title: "Đăng ký Khóa học Lập trình Frontend",
        category: "course_tuition",
        amount: 850000,
        date: "2026-06-12",
        type: "expense",
        notes: "Khóa học online mảng React"
      },
      {
        id: "t4",
        title: "Bữa trưa hội nhóm clb tin học",
        category: "living_food",
        amount: 120000,
        date: "2026-06-13",
        type: "expense",
        notes: "Ăn phở cùng CLB"
      }
    ];
  });

  const [savingGoals, setSavingGoals] = useState<SavingGoal[]>(() => {
    const saved = localStorage.getItem("vietlearn_saving_goals");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse saving goals", err);
      }
    }
    // Default visual goals
    return [
      {
        id: "g1",
        name: "Lệ phí thi chứng chỉ IELTS",
        targetAmount: 4750000,
        currentAmount: 2000000,
        deadline: "2026-09-30"
      },
      {
        id: "g2",
        name: "Đổi laptop phục vụ lập trình",
        targetAmount: 18000000,
        currentAmount: 5000000,
        deadline: "2026-12-31"
      }
    ];
  });

  // Keep state synced with localStorage
  useEffect(() => {
    localStorage.setItem("vietlearn_transactions", JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem("vietlearn_saving_goals", JSON.stringify(savingGoals));
  }, [savingGoals]);

  // --- Interactive Form States ---
  const [formType, setFormType] = useState<"expense" | "income">("expense");
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<keyof typeof CATEGORY_MAP>("study_material");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [formNotes, setFormNotes] = useState("");
  const [activeTemplateTab, setActiveTemplateTab] = useState<"learning" | "living" | "bills" | "entertainment">("learning");
  const [chartSubTab, setChartSubTab] = useState<"cumulative" | "daily">("cumulative");

  // Goal Form States
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState<string>("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [showGoalForm, setShowGoalForm] = useState(false);

  // Custom Category Colors State
  const [categoryHexColors, setCategoryHexColors] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem("vietlearn_category_colors");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Failed to parse category colors", err);
      }
    }
    return {
      study_material: "#3b82f6", // Blue
      course_tuition: "#6366f1", // Indigo
      living_food: "#10b981",    // Emerald
      housing_bills: "#f59e0b",   // Amber
      entertainment: "#f43f5e",   // Rose
      other: "#64748b"            // Slate
    };
  });

  useEffect(() => {
    localStorage.setItem("vietlearn_category_colors", JSON.stringify(categoryHexColors));
  }, [categoryHexColors]);

  // Quick Filters
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Allocate funds to savings modal/state
  const [fundingGoalId, setFundingGoalId] = useState<string | null>(null);
  const [fundingAmount, setFundingAmount] = useState<string>("");

  // --- Computations ---
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;

  // Group expenses by category for insights
  const expenseByCategory = transactions
    .filter(t => t.type === "expense")
    .reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {} as Record<string, number>);

  const sortedCategoriesByAmount = Object.entries(expenseByCategory).sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];

  // --- Recharts Chart Preparations ---
  // 1. Pie Chart for Expenses Category
  // We mapping our CATEGORY_MAP to feed actual labels and custom styling colors
  const expensePieData = Object.entries(expenseByCategory).map(([category, amount]) => {
    return {
      name: CATEGORY_MAP[category]?.label || "Khác",
      value: amount,
      categoryKey: category,
    };
  });

  // 2. Chronological AreaChart Data (Income, Expense, and Cumulative Balance over time)
  interface DateGroupItem {
    rawDate: string;
    date: string;
    income: number;
    expense: number;
    cumulativeBalance: number;
  }
  const transactionsByDate = [...transactions]
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce((acc, current) => {
      const existing = acc.find(item => item.rawDate === current.date);
      if (existing) {
        if (current.type === "income") {
          existing.income += current.amount;
        } else {
          existing.expense += current.amount;
        }
      } else {
        const parts = current.date.split("-");
        // format "YYYY-MM-DD" -> "DD/MM"
        const formatted = parts.length >= 3 ? `${parts[2]}/${parts[1]}` : current.date;
        acc.push({
          rawDate: current.date,
          date: formatted,
          income: current.type === "income" ? current.amount : 0,
          expense: current.type === "expense" ? current.amount : 0,
          cumulativeBalance: 0
        });
      }
      return acc;
    }, [] as DateGroupItem[]);

  // Sorting dates chronologically
  const sortedDateGroups = transactionsByDate.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

  // Compute a rolling cumulative balance
  let currentCumulative = 0;
  const trendChartData = sortedDateGroups.map(day => {
    currentCumulative += (day.income - day.expense);
    return {
      ...day,
      cumulativeBalance: currentCumulative
    };
  });

  // Format currency helper (VND)
  const formatVND = (num: number) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
  };

  // --- Action Handlers ---
  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newTx: Transaction = {
      id: "tx_" + Date.now(),
      title: formTitle.trim(),
      category: formType === "income" ? "other" : formCategory,
      amount: numAmount,
      date: formDate,
      type: formType,
      notes: formNotes.trim() || undefined
    };

    setTransactions((prev) => [newTx, ...prev]);

    // Reset fields
    setFormTitle("");
    setFormAmount("");
    setFormNotes("");
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalName.trim()) return;
    const target = parseFloat(goalTarget);
    if (isNaN(target) || target <= 0) return;

    const newGoal: SavingGoal = {
      id: "goal_" + Date.now(),
      name: goalName.trim(),
      targetAmount: target,
      currentAmount: 0,
      deadline: goalDeadline || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10)
    };

    setSavingGoals((prev) => [...prev, newGoal]);
    setGoalName("");
    setGoalTarget("");
    setGoalDeadline("");
    setShowGoalForm(false);
  };

  const handleDeleteGoal = (id: string) => {
    setSavingGoals((prev) => prev.filter((g) => g.id !== id));
  };

  // Fund savings goal helper
  const handleFundGoal = () => {
    if (!fundingGoalId) return;
    const amount = parseFloat(fundingAmount);
    if (isNaN(amount) || amount <= 0) return;

    // Check if we have enough balance
    if (amount > netBalance) {
      alert("Số dư khả dụng hiện tại không đủ để chuyển vào quỹ tiết kiệm này.");
      return;
    }

    // Add saving funding as a special transaction representation so balance updates!
    const targetGoal = savingGoals.find(g => g.id === fundingGoalId);
    if (!targetGoal) return;

    const dummyExpense: Transaction = {
      id: "fund_tx_" + Date.now(),
      title: `Tiết kiệm: ${targetGoal.name}`,
      category: "other",
      amount: amount,
      date: new Date().toISOString().substring(0, 10),
      type: "expense",
      notes: "Tích lũy vào quỹ heo đất"
    };

    setTransactions((prev) => [dummyExpense, ...prev]);
    setSavingGoals((prev) =>
      prev.map((g) =>
        g.id === fundingGoalId
          ? { ...g, currentAmount: Math.min(g.targetAmount, g.currentAmount + amount) }
          : g
      )
    );

    setFundingGoalId(null);
    setFundingAmount("");
  };

  // --- Dynamic Smart Advising (Algorithmic AI-Lab feel) ---
  const getAdvisorNotes = () => {
    if (transactions.length === 0) {
      return {
        tone: "Khởi động",
        status: "info",
        text: "Hãy nhập các khoản tiêu dùng hoặc thu nhập ban đầu (tiền làm thêm, tiền mừng, học bổng) để kích hoạt cố vấn tài chính AI Lab."
      };
    }

    const expenseRatio = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 100;
    
    // Check if student has high expense ratio
    if (expenseRatio > 90 && netBalance > 0) {
      return {
        tone: "Cảnh báo cao",
        status: "warning",
        text: "Bạnđã chi tiêu gần hết thu nhập của mình (gần " + Math.round(expenseRatio) + "%). Hãy cân nhắc cắt giảm các khoản 'Giải trí & Công nghệ' để có bộ đệm tốt hơn cho việc học."
      };
    } else if (netBalance < 0) {
      return {
        tone: "Thâm hụt Ngân sách",
        status: "danger",
        text: "Số dư của bạn đang bị âm " + formatVND(Math.abs(netBalance)) + ". Điều này có nghĩa bạn đang mượn trước hoặc chi tiêu quá khả năng chi trả. Hãy tập trung ưu tiên cho 'Ăn uống sinh hoạt' và 'Sách học tập' và hoãn các chi phí giải trí."
      };
    } else if (expenseRatio < 40 && totalIncome > 0) {
      return {
        tone: "Tuyệt vời & Khôn Ngoan",
        status: "success",
        text: "Chỉ số chi tiêu của bạn cực kỳ tốt! Bạn mới dùng " + Math.round(expenseRatio) + "% ngân sách học tập. Đây là thời cơ vàng để trích ngay " + formatVND(netBalance * 0.5) + " vào Quỹ heo đất để mua Khóa học hoặc đóng học phí kỳ kế tiếp."
      };
    } else {
      // Find top categories
      if (sortedCategoriesByAmount.length > 0) {
        const topCat = sortedCategoriesByAmount[0][0];
        const topCatAmount = sortedCategoriesByAmount[0][1];
        const percentageOfExpenses = (topCatAmount / totalExpense) * 100;

        if (topCat === "entertainment" && percentageOfExpenses > 30) {
          return {
            tone: "Tối ưu hóa Chi tiêu",
            status: "warning",
            text: `Bạn đang chi quá nhiều cho "Giải trí & Công nghệ" (${Math.round(percentageOfExpenses)}% tổng chi). Thử áp dụng công thức 50/30/20: dành ít nhất 20% tiết kiệm trước khi mua sắm các thiết bị phi học tập.`
          };
        }
        if (topCat === "course_tuition" || topCat === "study_material") {
          return {
            tone: "Đầu tư Bản thân lý tưởng",
            status: "success",
            text: `Hầu hết chi tiêu của bạn tập trung vào "Đầu tư Giáo dục" (${Math.round(percentageOfExpenses)}% tổng chi). Đây là khoản đầu tư thông minh sinh lợi dài hạn. Cố vấn khuyên bạn hãy tích hợp các mục tiêu săn học bổng để gia tăng nguồn thu nhập học thuật.`
          };
        }
      }

      return {
        tone: "Cân bằng Ổn định",
        status: "success",
        text: `Tỷ lệ chi tiêu học tập của bạn đang ở mức rất cân bằng (${Math.round(expenseRatio)}% thu nhập). Trạng thái tài chính ổn định sẽ giúp tâm lý ôn thi của bạn tốt nhất!`
      };
    }
  };

  const adNote = getAdvisorNotes();

  // Filter logic
  const filteredTransactions = transactions.filter((t) => {
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    const matchType = filterType === "all" || t.type === filterType;
    return matchCat && matchType;
  });

  return (
    <div className="flex flex-col gap-8 w-full animate-fade-in" id="budget-tracker-root">
      
      {/* Title & Visual Introduction */}
      <div className="border-b border-slate-200 pb-3">
        <h2 className="text-xl font-bold text-slate-805 flex items-center gap-2">
          <PiggyBank className="text-indigo-600 animate-bounce" size={24} />
          Trình Quản Lý Chi Tiêu & Dự Trù Tiết Kiệm Học Tập (VietLearn Finance Lab)
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Lập kế hoạch cân đối chi phí sinh hoạt, mua sắm sách giáo trình, ghi chú học phí và phân bổ heo đất tiết kiệm hướng tới mục tiêu cá nhân.
        </p>
      </div>

      {/* Grid: Stats Cards on Top */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        
        {/* Wallet / Available Balance */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50/40 rounded-full translate-x-6 -translate-y-6" />
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center flex-shrink-0 relative z-10">
            <Wallet size={22} />
          </div>
          <div className="relative z-10 flex-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SỐ DƯ KHẢ DỤNG</span>
            <span className={`text-xl font-extrabold tracking-tight block mt-0.5 ${netBalance >= 0 ? "text-indigo-600" : "text-rose-600"}`}>
              {formatVND(netBalance)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Sẵn sàng cho các mục tiêu học tập
            </p>
          </div>
        </div>

        {/* Expenses (Đã Tiêu Dùng) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50/40 rounded-full translate-x-6 -translate-y-6" />
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center flex-shrink-0 relative z-10">
            <TrendingDown size={22} />
          </div>
          <div className="relative z-10 flex-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TỔNG ĐÃ DÙNG</span>
            <span className="text-xl font-extrabold text-rose-600 tracking-tight block mt-0.5">
              {formatVND(totalExpense)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Chiếm {totalIncome > 0 ? Math.round((totalExpense / totalIncome) * 100) : 0}% của tổng thu
            </p>
          </div>
        </div>

        {/* Deposits / Incomes */}
        <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-xs flex items-center gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/40 rounded-full translate-x-6 -translate-y-6" />
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center flex-shrink-0 relative z-10">
            <TrendingUp size={22} />
          </div>
          <div className="relative z-10 flex-1">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">TỔNG NGUỒN THU</span>
            <span className="text-xl font-extrabold text-emerald-600 tracking-tight block mt-0.5">
              {formatVND(totalIncome)}
            </span>
            <p className="text-[10px] text-slate-400 mt-1">
              Gia sư, học bổng, trợ cấp gia đình...
            </p>
          </div>
        </div>

      </div>

      {/* AI Financial Labs Advisor Banner */}
      <div className={`p-4 md:p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-3xs ${
        adNote.status === "danger" ? "bg-rose-50 border-rose-200 text-rose-800" :
        adNote.status === "warning" ? "bg-amber-50 border-amber-200 text-amber-800" :
        "bg-indigo-50/50 border-indigo-100 text-indigo-900"
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            adNote.status === "danger" ? "bg-rose-100 text-rose-700" :
            adNote.status === "warning" ? "bg-amber-100 text-amber-700" :
            "bg-indigo-100 text-indigo-700"
          }`}>
            <Sparkles size={18} className="animate-pulse" />
          </div>
          <div>
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full inline-block mb-1 ${
              adNote.status === "danger" ? "bg-rose-200 text-rose-800" :
              adNote.status === "warning" ? "bg-amber-200 text-amber-800" :
              "bg-indigo-200 text-indigo-800"
            }`}>
              Cố vấn Tài chính AI Lab • {adNote.tone}
            </span>
            <p className="text-xs font-semibold leading-relaxed font-sans">{adNote.text}</p>
          </div>
        </div>
        <div className="hidden md:block text-right flex-shrink-0 text-[10px] font-mono text-slate-400">
          VietLearn AI FinEngine
        </div>
      </div>

      {/* Phân Tích & Biểu Đồ Thống Kê Học Đường */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span className="text-lg">📊</span>
              Trung Tâm Phân Tích Tài Chính Phổ Thông (VietLearn Finance Labs)
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Trực quan hóa hoạt động và xu hướng tích lũy đồng hành cùng kết quả học tập của học viên.
            </p>
          </div>

          {/* Sub-tabs for trend chart options */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setChartSubTab("cumulative")}
              className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                chartSubTab === "cumulative"
                  ? "bg-white text-indigo-700 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              📈 Xu hướng Tích lũy
            </button>
            <button
              onClick={() => setChartSubTab("daily")}
              className={`py-1 px-3 rounded-lg text-[10px] font-bold transition-all ${
                chartSubTab === "daily"
                  ? "bg-white text-indigo-700 shadow-3xs"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              🔄 So sánh Thu - Chi
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Trend Area / Flow Chart (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3 min-h-[220px]">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {chartSubTab === "cumulative" ? "📈 Đồ thị biến động số dư theo ngày" : "🔄 Nhật ký cụ thể thu & chi hàng ngày"}
              </span>
              <span className="text-[9px] font-mono text-slate-400">
                Độ chia tỷ lệ tự chuyển đổi (VND)
              </span>
            </div>

            {trendChartData.length < 2 ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/50 p-6 rounded-2xl text-center">
                <span className="text-xl mb-1.5">📈</span>
                <p className="text-xs font-semibold text-slate-500 leading-relaxed">
                  Chưa đủ dữ liệu để vẽ biểu đồ phân tích thời gian
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs">
                  Vui lòng bổ sung thêm giao dịch (thu hoặc chi) thuộc các mốc ngày khác nhau để hệ thống tích lũy dòng tài chính dòng chảy.
                </p>
              </div>
            ) : (
              <div className="flex-1 w-full min-h-[180px]">
                {chartSubTab === "cumulative" ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorBalanceBlue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${val / 1000000}M`
                            : val >= 1000
                            ? `${val / 1000}k`
                            : val
                        }
                      />
                      <Tooltip
                        formatter={(value: any) => [formatVND(Number(value)), "Số dư tích lũy"]}
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderRadius: "12px",
                          color: "#fff",
                          border: "none",
                          fontSize: "11px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeBalance"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorBalanceBlue)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendChartData} margin={{ top: 5, right: 10, left: -22, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis
                        dataKey="date"
                        stroke="#94a3b8"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#94a3b8"
                        fontSize={9}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(val) =>
                          val >= 1000000
                            ? `${val / 1000000}M`
                            : val >= 1000
                            ? `${val / 1000}k`
                            : val
                        }
                      />
                      <Tooltip
                        formatter={(value: any, name: string) => [
                          formatVND(Number(value)),
                          name === "income" ? "Khoản thu (+)" : "Khoản chi (-)",
                        ]}
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderRadius: "12px",
                          color: "#fff",
                          border: "none",
                          fontSize: "11px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="income"
                        name="income"
                        stroke="#10b981"
                        strokeWidth={1.8}
                        fillOpacity={1}
                        fill="url(#colorIncome)"
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        name="expense"
                        stroke="#ef4444"
                        strokeWidth={1.8}
                        fillOpacity={1}
                        fill="url(#colorExpense)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            )}
          </div>

          {/* Pie Chart Component inside layout (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-5 lg:pt-0 lg:pl-6 min-h-[200px]">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              🍕 Cơ cấu các khoản chi tiêu học đường
            </span>

            {expensePieData.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-slate-200 bg-slate-50/50 p-6 rounded-2xl text-center">
                <span className="text-xl mb-1.5">🍕</span>
                <p className="text-xs font-semibold text-slate-500">Chưa nảy sinh chi tiêu</p>
                <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                  Tích chọn các mục chi tiêu ở biểu mẫu Nhập Giao Dịch bên dưới để lập tức hiển thị tỉ lệ phân bổ!
                </p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-center justify-center gap-4">
                {/* Canvas Pie */}
                <div className="w-1/2 min-w-[130px] max-w-[150px] flex justify-center relative">
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={expensePieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={54}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {expensePieData.map((entry, index) => {
                          const color = categoryHexColors[entry.categoryKey] || "#64748b";
                          return <Cell key={`cell-${index}`} fill={color} />;
                        })}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [formatVND(Number(value)), "Đã chi"]}
                        contentStyle={{
                          backgroundColor: "#1e293b",
                          borderRadius: "12px",
                          color: "#fff",
                          border: "none",
                          fontSize: "11px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center percentage summary indicator */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                    <span className="text-[10px] font-black text-slate-700">TỔNG</span>
                    <span className="text-[8px] font-mono font-bold text-slate-500">{formatVND(totalExpense).replace("₫", "đ")}</span>
                  </div>
                </div>

                {/* Table details list */}
                <div className="flex-1 flex flex-col gap-1.5 w-full">
                  {expensePieData.slice(0, 4).map((item, index) => {
                    const pct = totalExpense > 0 ? Math.round(((item.value as number) / totalExpense) * 100) : 0;
                    const color = categoryHexColors[item.categoryKey] || "#64748b";
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100 hover:bg-slate-100/50 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-slate-600 font-bold truncate">{item.name}</span>
                        </div>
                        <div className="text-right flex-shrink-0 font-mono font-black text-slate-700 ml-1">
                          {pct}%
                        </div>
                      </div>
                    );
                  })}
                  {expensePieData.length > 4 && (
                    <div className="text-[9px] text-slate-400 text-center italic mt-0.5">
                      + và {expensePieData.length - 4} danh mục chi lẻ khác...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tùy chỉnh màu sắc các danh mục (Color Label Labs) */}
            <div className="mt-3 pt-4 border-t border-slate-100 flex flex-col gap-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-dashed border-slate-100 pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">🎨</span>
                  <div>
                    <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest leading-none">
                      Phòng Thí Nghiệm Nhãn Màu (Color Labs)
                    </h4>
                    <p className="text-[8px] text-slate-400 mt-0.5">
                      Nhấp vào bong bóng màu tròn trịa để tùy biến hoặc áp dụng dải màu đẹp đẽ!
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryHexColors({
                      study_material: "#3b82f6",
                      course_tuition: "#6366f1",
                      living_food: "#10b981",
                      housing_bills: "#f59e0b",
                      entertainment: "#f43f5e",
                      other: "#64748b"
                    });
                  }}
                  className="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 transition underline underline-offset-2 self-start sm:self-center"
                >
                  Mặc định
                </button>
              </div>

              {/* Quick Collection Color Presets */}
              <div className="flex flex-wrap gap-1 items-center">
                <span className="text-[8px] font-bold text-slate-400">Bộ mảng đề xuất:</span>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryHexColors({
                      study_material: "#3b82f6", // Sky/Blue
                      course_tuition: "#6366f1", // Indigo
                      living_food: "#10b981",    // Emerald
                      housing_bills: "#f59e0b",   // Amber
                      entertainment: "#f43f5e",   // Rose
                      other: "#64748b"            // Slate
                    });
                  }}
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-blue-100 bg-blue-50 text-blue-700 hover:bg-blue-105 transition whitespace-nowrap"
                >
                  🍃 Thiên Nhiên (Pastel)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryHexColors({
                      study_material: "#06b6d4", // Cyan
                      course_tuition: "#8b5cf6", // Purple/Violet
                      living_food: "#14b8a6",    // Teal
                      housing_bills: "#eab308",   // Yellow/Amber
                      entertainment: "#ec4899",   // Pink
                      other: "#64748b"            // Gray
                    });
                  }}
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-pink-100 bg-pink-50 text-pink-700 hover:bg-pink-105 transition whitespace-nowrap"
                >
                  🍬 Kẹo Ngọt
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryHexColors({
                      study_material: "#9a3412", // Dark Orange
                      course_tuition: "#854d0e", // Brown Gold
                      living_food: "#166534",    // Dark Green
                      housing_bills: "#075985",   // Deep Blue
                      entertainment: "#9d174d",   // Wine Rose
                      other: "#475569"            // Charcoal Slate
                    });
                  }}
                  className="px-1.5 py-0.5 rounded text-[8px] font-bold border border-amber-100 bg-amber-50/70 text-amber-800 hover:bg-amber-105 transition whitespace-nowrap"
                >
                  🍁 Thu Ấm
                </button>
              </div>

              {/* Category-by-category Manual Color selection */}
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(CATEGORY_MAP).map(([key, value]) => {
                  const currentCategoryHex = categoryHexColors[key] || "#64748b";
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between border border-slate-100/70 p-1.5 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition-colors min-w-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {/* Inline color input picker bubble */}
                        <div className="relative w-3.5 h-3.5 rounded-full border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          <input
                            type="color"
                            value={currentCategoryHex}
                            onChange={(e) => {
                              setCategoryHexColors((prev) => ({
                                ...prev,
                                [key]: e.target.value
                              }));
                            }}
                            className="absolute -inset-1 cursor-pointer w-7 h-7 p-0 border-0 outline-none"
                            title={`Tùy chỉnh màu sắc ${value.label}`}
                          />
                        </div>
                        <span className="text-[9px] font-bold text-slate-600 truncate" title={value.label}>
                          {value.label}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono font-black text-slate-500 pl-1 block ml-auto flex-shrink-0">
                        {currentCategoryHex.toUpperCase()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Main Content Split Area (Form & Transactions vs. Saving Goals List) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        
        {/* Left Column: Form and Logs (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Form to Add Transaction */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">
              📝 Nhập Giao Dịch Mới
            </h3>

            {/* Quick Template Checklists Selection */}
            <div className="bg-gradient-to-tr from-slate-50 to-indigo-50/50 border border-indigo-100/50 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-[11px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="text-indigo-600 animate-pulse" size={13} />
                    Danh Mục Gợi Ý & Nhập Nhanh
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Chọn nhóm danh sách, tích chọn mục có sẵn để tự động điền thông tin và giá đề xuất!
                  </p>
                </div>
              </div>

              {/* Tabs list switch */}
              <div className="flex flex-wrap gap-1 bg-slate-105 p-1 rounded-xl bg-slate-100">
                {(Object.keys(TEMPLATE_LISTS) as Array<keyof typeof TEMPLATE_LISTS>).map((key) => {
                  const item = TEMPLATE_LISTS[key];
                  const isActive = activeTemplateTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTemplateTab(key)}
                      className={`flex-1 py-1.5 px-2 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 sm:gap-1.5 ${
                        isActive
                          ? "bg-white text-indigo-700 shadow-3xs border border-indigo-100"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <span className="text-xs">{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Templates inside active selection list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto pr-1">
                {TEMPLATE_LISTS[activeTemplateTab].templates.map((tpl, i) => {
                  const isSelected = formTitle === tpl.title;
                  return (
                    <div
                      key={i}
                      onClick={() => {
                        setFormTitle(tpl.title);
                        setFormCategory(tpl.category);
                        setFormAmount(tpl.suggestedAmount.toString());
                        setFormType("expense");
                        // Automatically set notes
                        setFormNotes(`Lấy nhanh từ biểu mẫu ${TEMPLATE_LISTS[activeTemplateTab].label}`);
                      }}
                      className={`border p-2.5 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 text-left ${
                        isSelected
                          ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-550"
                          : "bg-white text-slate-700 border-slate-200/80 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm">{tpl.icon}</span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-slate-800 truncate">
                            {tpl.title}
                          </p>
                          <span className="text-[9px] font-mono font-medium block text-indigo-600">
                            Giá gợi ý: {tpl.suggestedAmount.toLocaleString("vi-VN")}đ
                          </span>
                        </div>
                      </div>
                      
                      {/* Interactive tick circle */}
                      <div className={`w-4.5 h-4.5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                        isSelected 
                          ? "border-indigo-600 bg-indigo-600 text-white" 
                          : "border-slate-300 bg-slate-50"
                      }`}>
                        {isSelected && <span className="text-[9px] font-bold">✓</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleAddTransaction} className="flex flex-col gap-4">
              
              {/* Selector: Expense vs Income */}
              <div className="flex bg-slate-100 p-1 rounded-xl w-full self-start max-w-xs">
                <button
                  type="button"
                  onClick={() => {
                    setFormType("expense");
                    setFormCategory("study_material");
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    formType === "expense"
                      ? "bg-white text-indigo-700 shadow-3xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Khoản Chi tiêu (-)
                </button>
                <button
                  type="button"
                  onClick={() => setFormType("income")}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                    formType === "income"
                      ? "bg-white text-emerald-700 shadow-3xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Khoản Thu nhập (+)
                </button>
              </div>

              {/* Title & Amount Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Tên khoản giao dịch</label>
                  <input
                    type="text"
                    required
                    placeholder={formType === "expense" ? "Ví dụ: Sách song ngữ IELTS, Tiền ăn trưa..." : "Ví dụ: Dạy kèm IELTS, Học bổng HK1..."}
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400 flex items-center justify-between">
                    <span>Số tiền (VND)</span>
                    <span className="text-[9px] text-slate-400">Gợi ý nhanh mệnh giá 🔽</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min="1"
                      placeholder="Nhập số tiền..."
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      className="p-2 pl-7 w-full border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                    />
                    <div className="absolute left-2.5 top-2.5 text-slate-400 text-xs font-medium">₫</div>
                  </div>

                  {/* Pricing Preset Buttons (Denominations) */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {[10000, 20000, 50000, 100000, 200000, 500000].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormAmount(val.toString())}
                        className="py-1 px-1.5 border border-slate-200 rounded-md text-[9px] bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition font-bold"
                      >
                        {val >= 1000 ? `${val / 1000}k` : val}
                      </button>
                    ))}
                  </div>
                </div>

              </div>

              {/* Category selector & Date Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {formType === "expense" ? (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Phân loại chi phí</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400"
                    >
                      <option value="study_material">📚 Sách & Đồ dùng học tập</option>
                      <option value="course_tuition">🎓 Học phí & Khóa học ôn luyện</option>
                      <option value="living_food">🍲 Ăn uống & Sinh hoạt hàng ngày</option>
                      <option value="housing_bills">🔌 Nhà thuê & Tiền điện nước điện thoại</option>
                      <option value="entertainment">🎮 Giải trí, Thiết bị & Trò chơi</option>
                      <option value="other">📌 Chi phí cá nhân khác</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Danh mục thu</label>
                    <input
                      type="text"
                      disabled
                      value="Trợ cấp / Thu nhập làm thêm"
                      className="p-2 border border-slate-100 bg-slate-50 text-slate-400 rounded-lg text-xs"
                    />
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Ngày giao dịch</label>
                  <div className="flex gap-1.5 items-center">
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400 flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setFormDate(new Date().toISOString().substring(0, 10))}
                      className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 transition rounded-lg text-xs font-semibold whitespace-nowrap"
                      title="Chọn mốc ngày hôm nay"
                    >
                      Hôm nay 📅
                    </button>
                  </div>
                </div>

              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Ghi chú nhanh (Tùy chọn)</label>
                <input
                  type="text"
                  placeholder="Thêm mô tả về nhà sách, địa điểm hoặc hình thức chuyển khoản..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className={`py-2 px-4 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 self-end ${
                  formType === "expense" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Plus size={14} /> Thêm Giao dịch
              </button>

            </form>
          </div>

          {/* Transactions list & filter */}
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-4">
            
            {/* Header + Filter elements */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Filter size={14} className="text-slate-500" />
                Lịch Sử Giao Dịch ({filteredTransactions.length})
              </h3>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="p-1 px-2 border border-slate-200 rounded-lg text-[10px] bg-white text-slate-600 font-semibold outline-none"
                >
                  <option value="all">Tất cả Kiểu thu/chi</option>
                  <option value="expense">Chỉ Khoản Chi (-)</option>
                  <option value="income">Chỉ Khoản Thu (+)</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="p-1 px-2 border border-slate-200 rounded-lg text-[10px] bg-white text-slate-600 font-semibold outline-none"
                >
                  <option value="all">Tất cả Danh mục</option>
                  <option value="study_material">📚 Sách học tập</option>
                  <option value="course_tuition">🎓 Học phí / Khóa học</option>
                  <option value="living_food">🍲 Ăn uống sinh hoạt</option>
                  <option value="housing_bills">🔌 Nhà thuê & Hoá đơn</option>
                  <option value="entertainment">🎮 Giải trí & Thiết bị</option>
                  <option value="other">📌 Khác</option>
                </select>
              </div>
            </div>

            {/* List */}
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 italic">
                Không tìm thấy giao dịch nào khớp với tiêu chuẩn bộ lọc lọc ra.
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                {filteredTransactions.map((t) => {
                  const catDetails = t.type === "expense" ? CATEGORY_MAP[t.category] : { label: "Nguồn Thu / Thu Nhập", color: "text-emerald-600 border-emerald-100", bg: "bg-emerald-50" };

                  return (
                    <div 
                      key={t.id} 
                      className="border border-slate-100 hover:border-slate-200 p-3 rounded-2xl flex items-center justify-between gap-3 transition-all hover:bg-slate-50/50"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Type Icon indicator */}
                        <div className={`p-2 rounded-xl flex-shrink-0 ${
                          t.type === "income" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}>
                          {t.type === "income" ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 truncate" title={t.title}>
                            {t.title}
                          </h4>
                          
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                            {/* Category pill */}
                            <span className={`px-1.5 py-0.5 border rounded-md text-[9px] font-medium ${catDetails?.color} ${catDetails?.bg}`}>
                              {catDetails?.label}
                            </span>
                            {/* Date */}
                            <span className="text-slate-400 flex items-center gap-0.5 font-mono">
                              <Calendar size={10} /> {t.date}
                            </span>
                            {/* Notes */}
                            {t.notes && (
                              <span className="text-slate-500 italic max-w-[120px] truncate" title={t.notes}>
                                ({t.notes})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right amount and Delete button */}
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold font-mono whitespace-nowrap ${t.type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                          {t.type === "income" ? "+" : "-"}{formatVND(t.amount)}
                        </span>

                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                          title="Xóa giao dịch này"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Summary footnote */}
            <div className="bg-slate-50 p-3 rounded-2xl text-[10px] text-slate-500 text-center">
              Nhấn nút Thùng rác để khôi phục hoặc xóa bớt. Toàn bộ dữ liệu nằm an toàn tại bộ nhớ cục bộ trình duyệt của học sinh.
            </div>

          </div>

        </div>

        {/* Right Column: Goal Planner Piggy (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col gap-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <PiggyBank className="text-rose-500" size={15} />
                Quỹ Đất Heo Tiết Kiệm Học Tập (Savings Goals)
              </h3>
              
              <button
                onClick={() => setShowGoalForm(!showGoalForm)}
                className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-150 rounded-lg px-2.5 py-1 hover:bg-indigo-100 transition"
              >
                {showGoalForm ? "Xóa Form" : "Thêm Quỹ Mới"}
              </button>
            </div>

            {/* Allocation savings modal look-alike inline */}
            {fundingGoalId && (
              <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 text-white rounded-2xl p-4 flex flex-col gap-3 animate-fade-in text-xs">
                <div>
                  <h4 className="font-bold text-yellow-300">🐷 Trích tiền chuyển vào Quỹ Tiết Kiệm</h4>
                  <p className="text-[10px] text-indigo-200 mt-0.5">Số dư khả dụng tối đa: <strong className="text-white">{formatVND(netBalance)}</strong></p>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="number"
                      required
                      min="1000"
                      max={netBalance}
                      placeholder="Số tiền cần chuyển..."
                      value={fundingAmount}
                      onChange={(e) => setFundingAmount(e.target.value)}
                      className="p-1 px-2.5 pl-6 w-full text-slate-800 bg-white rounded-lg text-xs outline-none text-left"
                    />
                    <div className="absolute left-2 top-1 w-3 text-slate-400">₫</div>
                  </div>

                  <button
                    onClick={handleFundGoal}
                    className="bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold px-3 py-1.5 rounded-lg text-xs"
                  >
                    Bỏ heo
                  </button>
                  <button
                    onClick={() => {
                      setFundingGoalId(null);
                      setFundingAmount("");
                    }}
                    className="bg-slate-700 hover:bg-slate-600 px-2 rounded-lg text-xs text-white"
                  >
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Form to Create Saving Goal */}
            {showGoalForm && (
              <form onSubmit={handleAddGoal} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 text-xs animate-fade-in">
                <span className="font-bold text-slate-700 block text-center">🎯 THIẾT LẬP MỤC TIÊU TIẾT KIỆM MỚI</span>
                
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Tên mục tiêu tích lũy</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Thi JLPT N3, Lệ phí Học quân sự..."
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="p-2 border border-slate-200 rounded-lg text-xs bg-white outline-none focus:border-indigo-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Số tiền mục tiêu</label>
                    <input
                      type="number"
                      required
                      min="1000"
                      placeholder="Số tiền VND..."
                      value={goalTarget}
                      onChange={(e) => setGoalTarget(e.target.value)}
                      className="p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400">Thời hạn hoàn thành</label>
                    <input
                      type="date"
                      value={goalDeadline}
                      onChange={(e) => setGoalDeadline(e.target.value)}
                      className="p-2 border border-slate-200 rounded-lg text-xs outline-none focus:border-indigo-400"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 rounded-lg text-xs shadow-3xs"
                >
                  Kích Hoạt Quỹ Tiết Kiệm
                </button>
              </form>
            )}

            {/* Goals Display */}
            {savingGoals.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400 italic">
                Bạn chưa có mục tiêu tiết kiệm nào. Hãy khởi tạo một mục tiêu mới!
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {savingGoals.map((g) => {
                  const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100)) || 0;
                  const isCompleted = g.currentAmount >= g.targetAmount;

                  return (
                    <div 
                      key={g.id} 
                      className={`border p-4 rounded-2xl flex flex-col gap-2.5 transition-all ${
                        isCompleted 
                          ? "bg-emerald-50/50 border-emerald-200" 
                          : "bg-slate-50/30 border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {g.name}
                            {isCompleted && (
                              <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0" />
                            )}
                          </h4>
                          <span className="text-[10px] text-slate-400 font-medium block mt-0.5 font-mono">
                            Khạn chót: {g.deadline}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {!isCompleted && (
                            <button
                              onClick={() => {
                                setFundingGoalId(g.id);
                                setFundingAmount("");
                              }}
                              className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[9px] font-black px-2 py-1 rounded-md hover:bg-indigo-100 transition"
                              title="Chuyển tiền vào quỹ heo đất chứa mục tiêu"
                            >
                              Nạp Quỹ 🐷
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                            title="Xóa mục tiêu này"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>

                      {/* Linear progression bar */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                          <span>Tiến trình: <strong className="text-slate-700">{percent}%</strong></span>
                          <span>{formatVND(g.currentAmount)} / {formatVND(g.targetAmount)}</span>
                        </div>

                        <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              isCompleted ? "bg-emerald-500" : "bg-indigo-600"
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>

                      {/* Insight / Cheer up note */}
                      <p className="text-[10px] text-slate-400 italic">
                        {isCompleted 
                          ? "🎉 Hãy rút tiền tiết kiệm để hoàn thành mục tiêu ngay hôm nay!" 
                          : `Cần chuẩn bị thêm ${formatVND(g.targetAmount - g.currentAmount)} nữa để đạt mốc.`}
                      </p>

                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick explanation info box about formula */}
            <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-3 text-[11px] text-indigo-900 leading-relaxed flex gap-2">
              <Info size={14} className="text-indigo-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-bold">Mẹo nhỏ Sức khỏe Kỹ năng:</span> Áp dụng quy tắc bỏ ống tiết kiệm tự động sau mỗi buổi học có thành tích cao (e.g. tăng điểm số ở game RPG hoặc trả lời đúng quiz) để biến kỷ luật tài chính thành niềm vui động lực!
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
