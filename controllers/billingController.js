const Bill = require('../models/Bill');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');

exports.createBill = async (req, res) => {
    const { clientId, items, discount } = req.body;

    try {
        let totalAmount = 0;
        const billItems = [];

        // Validate items and calculate total
        for (let item of items) {
            const product = await Product.findById(item.product);
            if (!product) return res.status(404).json({ message: `Product ${item.product} not found` });

            // STOCK VALIDATION - COMMENTED OUT
            // if (product.stock < item.quantity) return res.status(400).json({ message: `Insufficient stock for ${product.name}` });

            // DECREMENT STOCK - COMMENTED OUT
            // product.stock -= item.quantity;
            // await product.save();

            const amount = product.price * item.quantity;
            totalAmount += amount;

            billItems.push({
                product: product._id,
                name: product.name, // Store name in case it changes later
                quantity: item.quantity,
                price: product.price
            });
        }

        const finalAmount = totalAmount - (discount || 0);

        const bill = new Bill({
            client: clientId,
            items: billItems,
            totalAmount,
            discount,
            finalAmount
        });

        await bill.save();
        res.status(201).json(bill);

    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.getBills = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await Bill.countDocuments();
        const bills = await Bill.find()
            .populate('client')
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit);

        res.json({
            data: bills,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page * limit < total
            }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.downloadBillPDF = async (req, res) => {
    try {
        const bill = await Bill.findById(req.params.id).populate('client');
        if (!bill) return res.status(404).json({ message: 'Bill not found' });

        // Create PDF document
        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=bill-${bill.billNumber}.pdf`);

        // Pipe PDF to response
        doc.pipe(res);

        // Colors
        const primaryColor = '#b78fd1';
        const darkColor = '#202124';
        const grayColor = '#5f6368';

        // Header with company name
        doc.fontSize(28)
            .fillColor(primaryColor)
            .text('Mellou', 50, 50);

        doc.fontSize(10)
            .fillColor(grayColor)
            .text('Delicacy on Demand', 50, 85);

        // Bill title
        doc.fontSize(20)
            .fillColor(darkColor)
            .text('INVOICE', 400, 50, { align: 'right' });

        // Bill number and date
        doc.fontSize(10)
            .fillColor(grayColor)
            .text(`Bill #: ${bill.billNumber}`, 400, 75, { align: 'right' })
            .text(`Date: ${new Date(bill.date).toLocaleDateString('en-IN')}`, 400, 90, { align: 'right' });

        // Line separator
        doc.moveTo(50, 120)
            .lineTo(545, 120)
            .strokeColor(primaryColor)
            .lineWidth(2)
            .stroke();

        // Client details
        doc.fontSize(12)
            .fillColor(darkColor)
            .text('Bill To:', 50, 140);

        doc.fontSize(11)
            .fillColor(grayColor)
            .text(bill.client.name, 50, 160)
            .text(bill.client.phone, 50, 175);

        if (bill.client.address) {
            doc.text(bill.client.address, 50, 190);
        }
        if (bill.client.area) {
            doc.text(`${bill.client.area}${bill.client.subarea ? ', ' + bill.client.subarea : ''}`, 50, 205);
        }

        // Items table
        const tableTop = 250;
        const itemCodeX = 50;
        const descriptionX = 150;
        const quantityX = 350;
        const priceX = 420;
        const amountX = 490;

        // Table header
        doc.fontSize(11)
            .fillColor('white')
            .rect(50, tableTop, 495, 25)
            .fill(primaryColor);

        doc.fillColor('white')
            .text('#', itemCodeX + 5, tableTop + 7)
            .text('Item', descriptionX, tableTop + 7)
            .text('Qty', quantityX, tableTop + 7)
            .text('Price', priceX, tableTop + 7)
            .text('Amount', amountX, tableTop + 7);

        // Table rows
        let y = tableTop + 35;
        bill.items.forEach((item, index) => {
            const itemAmount = item.price * item.quantity;

            doc.fontSize(10)
                .fillColor(darkColor)
                .text(index + 1, itemCodeX + 5, y)
                .text(item.name, descriptionX, y, { width: 180 })
                .text(item.quantity, quantityX, y)
                .text(`₹${item.price.toFixed(2)}`, priceX, y)
                .text(`₹${itemAmount.toFixed(2)}`, amountX, y);

            // Row separator
            doc.moveTo(50, y + 20)
                .lineTo(545, y + 20)
                .strokeColor('#e0e0e0')
                .lineWidth(0.5)
                .stroke();

            y += 30;
        });

        // Summary section
        y += 20;
        const summaryX = 380;

        doc.fontSize(10)
            .fillColor(grayColor)
            .text('Subtotal:', summaryX, y)
            .text(`₹${bill.totalAmount.toFixed(2)}`, amountX, y);

        if (bill.discount > 0) {
            y += 20;
            doc.text('Discount:', summaryX, y)
                .text(`-₹${bill.discount.toFixed(2)}`, amountX, y);
        }

        y += 25;
        doc.fontSize(12)
            .fillColor(darkColor)
            .text('Total:', summaryX, y)
            .fontSize(14)
            .fillColor(primaryColor)
            .text(`₹${bill.finalAmount.toFixed(2)}`, amountX, y);

        // Footer
        doc.fontSize(9)
            .fillColor(grayColor)
            .text('Thank you for your business!', 50, 700, { align: 'center', width: 495 });

        doc.fontSize(8)
            .text('This is a computer-generated invoice', 50, 720, { align: 'center', width: 495 });

        // Finalize PDF
        doc.end();

    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
