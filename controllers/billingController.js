const Bill = require('../models/Bill');
const Product = require('../models/Product');
const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

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

        const settings = {
            companyName: "mellou",
            addressLine1: "CC 54/2593 5, Bose Nagar",
            addressLine2: "Road, Kadavanthara, Kochi,",
            addressLine3: "Ernakulam, Kerala, 682020",
            phone: "9526217009",
            website: "www.mellou.in",
            bank: {
                accName: "Mellou",
                accNo: "50200085316071",
                ifsc: "HDFC0000295"
            }
        };

        const doc = new PDFDocument({ margin: 50, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${bill.billNumber}.pdf`);
        doc.pipe(res);

        // --- FONTS & COLORS ---
        const fontRegular = 'Helvetica';
        const fontBold = 'Helvetica-Bold';
        const colors = {
            primary: '#b78fd1',    // Mellou Purple
            black: '#000000',
            darkGray: '#231F20',
            lightGray: '#E6E6E6',
            white: '#FFFFFF'
        };

        // --- HELPER: CURRENCY ---
        const formatCurrency = (amount) => `Rs. ${parseFloat(amount).toFixed(2)}`;

        // --- HEADER SECTION ---

        // 1. Logo (Top Left)
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 50, 45, { width: 45 });
        }

        // 2. Company Details (Next to Logo)
        const headerTextX = 110;
        let headerY = 50;

        doc.font(fontBold).fontSize(16).fillColor(colors.black)
            .text(settings.companyName, headerTextX, headerY);

        doc.font(fontRegular).fontSize(8).fillColor(colors.darkGray)
            .text(settings.addressLine1, headerTextX, headerY + 18)
            .text(settings.addressLine2, headerTextX, headerY + 30)
            .text(settings.addressLine3, headerTextX, headerY + 42);

        // 3. Arrow Icon (Top Right) - Simulated
        // Draw an arrow pointing North-East, aligned with Invoice Title
        // Invoice Title is at Y=130
        doc.save()
            .translate(500, 130) // Move down to align with Invoice
            .scale(1.5)
            .path('M10 0 L20 0 L20 10 M20 0 L0 20') // Simple arrow path
            .lineWidth(1.5)
            .strokeColor(colors.black)
            .stroke()
            .restore();

        // 4. Invoice Title (Large, Separated)
        const titleY = 130;
        doc.font(fontBold).fontSize(36).fillColor(colors.black)
            .text('Invoice', 50, titleY);

        // 5. Horizontal Line
        doc.moveTo(50, titleY + 45).lineTo(545, titleY + 45).lineWidth(1).strokeColor(colors.black).stroke();

        // --- META INFO ---
        const metaY = titleY + 60;

        // Left: Date & Invoice No
        const labelX = 50;
        const valueX = 120;

        doc.font(fontBold).fontSize(10).fillColor(colors.black)
            .text('Date :', labelX, metaY)
            .text('Invoice No.', labelX, metaY + 15);

        const dateStr = new Date(bill.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.font(fontRegular)
            .text(dateStr, valueX, metaY)
            .text(bill.billNumber, valueX, metaY + 15);

        // Right: Contact Info (Text only)
        doc.font(fontRegular).fontSize(10)
            .text(settings.phone, 350, metaY, { align: 'right' })
            .text(settings.website, 350, metaY + 15, { align: 'right' });

        // --- BILL TO ---
        const billToY = metaY + 45;
        doc.font(fontBold).fontSize(11).fillColor(colors.black)
            .text('Billed to:', 50, billToY);

        doc.font(fontRegular).fontSize(10)
            .text(bill.client.name, 50, billToY + 18)
            .text(bill.client.address || '', 50, billToY + 30)
            .text(bill.client.phone || '', 50, billToY + 42);

        // --- MAIN BOX (TABLE + TOTALS + PAYMENT INFO) ---

        const boxTop = billToY + 70;
        const col = { desc: 15, qty: 300, price: 375, total: 445 };
        const colWidths = { desc: 275, qty: 60, price: 60, total: 60 };

        // 1. Header Bar (Black)
        doc.rect(50, boxTop, 495, 25).fill(colors.black);

        doc.fillColor(colors.white).font(fontBold).fontSize(9)
            .text('DESCRIPTION', 50 + col.desc, boxTop + 8)
            .text('QUANTITY', 50 + col.qty, boxTop + 8, { width: colWidths.qty, align: 'center' })
            .text('PRICE', 50 + col.price, boxTop + 8, { width: colWidths.price, align: 'right' })
            .text('TOTAL', 50 + col.total, boxTop + 8, { width: colWidths.total, align: 'right' });

        // 2. Items
        let y = boxTop + 35;
        doc.fillColor(colors.black);

        bill.items.forEach(item => {
            const total = item.quantity * item.price;

            doc.font(fontRegular).fontSize(10)
                .text(item.name, 50 + col.desc, y, { width: colWidths.desc })
                .text(item.quantity, 50 + col.qty, y, { width: colWidths.qty, align: 'center' })
                .text(formatCurrency(item.price), 50 + col.price, y, { width: colWidths.price, align: 'right' })
                .text(formatCurrency(total), 50 + col.total, y, { width: colWidths.total, align: 'right' });

            y += 25; // Row height
        });

        // Add some spacing
        y += 10;

        // 3. Divider Line (Separating Items from Footer Section)
        doc.moveTo(50, y).lineTo(545, y).lineWidth(0.5).strokeColor(colors.black).stroke();

        // --- FOOTER SECTION (inside the box) ---
        const footerStart = y + 15;

        // Left Side: Payment Info
        const payY = footerStart;
        doc.font(fontBold).fontSize(11).fillColor(colors.black)
            .text('PAYMENT INFO', 65, payY);

        doc.font(fontBold).fontSize(9)
            .text('•  Account Name: ' + settings.bank.accName, 65, payY + 20)
            .text('•  Account No: ' + settings.bank.accNo, 65, payY + 35)
            .text('•  IFSC Code: ' + settings.bank.ifsc, 65, payY + 50);

        // Right Side: Totals
        const totalsXLabel = 340;
        const totalsXValue = 460;
        const totalsValWidth = 70;
        let tY = footerStart;

        const addTotalLine = (label, value, isBold = false) => {
            doc.font(isBold ? fontBold : fontRegular).fontSize(10).fillColor(colors.black)
                .text(label, totalsXLabel, tY, { align: 'right', width: 110 })
                .text(value, totalsXValue, tY, { align: 'right', width: totalsValWidth });
            tY += 18;
        };

        addTotalLine('Subtotal:', formatCurrency(bill.totalAmount));

        const taxVal = (bill.totalAmount * 0.025).toFixed(2);
        addTotalLine('Tax (2.5%):', formatCurrency(taxVal));
        addTotalLine('Tax (2.5%):', formatCurrency(taxVal));

        tY += 5;
        // Grand Total (Black Text, No Box)
        doc.font(fontBold).fontSize(12).fillColor(colors.black)
            .text('Grand Total:', totalsXLabel, tY, { align: 'right', width: 110 });
        doc.text(formatCurrency(bill.finalAmount), totalsXValue, tY, { align: 'right', width: totalsValWidth });

        // Calculate final Y for the box border
        // Use the lower of Payment Info or Totals
        const finalContentY = Math.max(payY + 60, tY + 15);
        y = finalContentY + 15; // Bottom padding

        // 4. DRAW THE BOX BORDER (Enclosing everything)
        // Check for page break if box is too large? (Simplified for now)
        doc.rect(50, boxTop, 495, y - boxTop).lineWidth(1).strokeColor(colors.black).stroke();

        // --- THANK YOU MESSAGE ---
        const bottomY = y + 30; // Below the box

        doc.font(fontBold).fontSize(16).fillColor(colors.black)
            .text('THANK YOU FOR', 50, bottomY)
            .text('YOUR BUSINESS', 50, bottomY + 20);

        // --- BOTTOM RECTANGLE (Purple) ---
        const pageHeight = 841.89;
        const pageWidth = 595.28;
        const barHeight = 15;

        doc.rect(0, pageHeight - barHeight, pageWidth, barHeight)
            .fill(colors.primary);

        doc.end();

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ message: err.message });
    }
};