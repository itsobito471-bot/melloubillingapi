const Expense = require('../models/Expense');
const ExpenseCategory = require('../models/ExpenseCategory');

// --- Categories ---

exports.getCategories = async (req, res) => {
    try {
        const categories = await ExpenseCategory.find().sort({ name: 1 });
        res.json(categories);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addCategory = async (req, res) => {
    try {
        const category = new ExpenseCategory(req.body);
        await category.save();
        res.status(201).json(category);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Category name must be unique' });
        }
        res.status(400).json({ message: err.message });
    }
};

exports.updateCategory = async (req, res) => {
    try {
        const category = await ExpenseCategory.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json(category);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Category name must be unique' });
        }
        res.status(400).json({ message: err.message });
    }
};

exports.deleteCategory = async (req, res) => {
    try {
        // Check if used in expenses
        const count = await Expense.countDocuments({ category: req.params.id });
        if (count > 0) {
            return res.status(400).json({ message: `Cannot delete category: used in ${count} expenses` });
        }

        const category = await ExpenseCategory.findByIdAndDelete(req.params.id);
        if (!category) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};


// --- Expenses ---

exports.getExpenses = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Optional filtering
        const query = {};
        if (req.query.startDate && req.query.endDate) {
            query.date = {
                $gte: new Date(req.query.startDate),
                $lte: new Date(req.query.endDate)
            };
        }
        if (req.query.categoryId) {
            query.category = req.query.categoryId;
        }

        const total = await Expense.countDocuments(query);
        const expenses = await Expense.find(query)
            .populate('category', 'name')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: expenses,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.getExpenseById = async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id).populate('category', 'name');
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json(expense);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addExpense = async (req, res) => {
    try {
        const data = req.body;
        if (req.file) {
            data.receiptUrl = `/uploads/expenses/${req.file.filename}`;
        }

        const expense = new Expense(data);
        await expense.save();
        const populatedExpense = await expense.populate('category', 'name');
        res.status(201).json(populatedExpense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.updateExpense = async (req, res) => {
    try {
        const data = req.body;
        if (req.file) {
            data.receiptUrl = `/uploads/expenses/${req.file.filename}`;
        }

        const expense = await Expense.findByIdAndUpdate(
            req.params.id,
            data,
            { new: true, runValidators: true }
        ).populate('category', 'name');

        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json(expense);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteExpense = async (req, res) => {
    try {
        const expense = await Expense.findByIdAndDelete(req.params.id);
        if (!expense) return res.status(404).json({ message: 'Expense not found' });
        res.json({ message: 'Expense deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
