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

        const doc = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });

        // --- 1. REGISTER CUSTOM FONTS ---
        // Make sure the paths point to where you saved the .ttf files
        const fontPathRegular = path.join(__dirname, '../assets/fonts/Poppins-Regular.ttf');
        const fontPathBold = path.join(__dirname, '../assets/fonts/Poppins-Bold.ttf');

        // Check if font files exist to avoid crashing if they are missing
        if (fs.existsSync(fontPathRegular) && fs.existsSync(fontPathBold)) {
            doc.registerFont('Poppins-Regular', fontPathRegular);
            doc.registerFont('Poppins-Bold', fontPathBold);
        } else {
            console.warn('Poppins fonts not found, falling back to Helvetica');
        }

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${bill.billNumber}.pdf`);
        doc.pipe(res);

        // --- 2. UPDATE FONT CONSTANTS ---
        // If the custom font was registered successfully, use it. Otherwise fallback.
        const useCustomFont = fs.existsSync(fontPathRegular);

        const fonts = {
            regular: useCustomFont ? 'Poppins-Regular' : 'Helvetica',
            bold: useCustomFont ? 'Poppins-Bold' : 'Helvetica-Bold'
        };

        const colors = {
            primary: '#b78fd1',
            black: '#000000',
            darkGray: '#333333',
            lightGray: '#E0E0E0',
            white: '#FFFFFF'
        };

        const startX = 50;
        const endX = 545; // This is the right alignment edge
        const contentWidth = endX - startX;

        // --- HELPER: FORMAT CURRENCY ---
        const formatCurrency = (amount) => `Rs. ${parseFloat(amount).toFixed(2)}`;

        // --- 1. HEADER SECTION ---
        const logoPath = path.join(__dirname, '../assets/logo.png');
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, startX, 45, { width: 40 });
        }

        const headerTextX = 100;
        let headerY = 45;

        doc.font(fonts.bold).fontSize(16).fillColor(colors.primary)
            .text('mellou', headerTextX, headerY);

        headerY += 20;
        doc.font(fonts.regular).fontSize(8).fillColor(colors.darkGray);
        doc.text('CC 54/2593 5, Bose Nagar', headerTextX, headerY);
        doc.text('Road, Kadavanthara, Kochi,', headerTextX, headerY + 12);
        doc.text('Ernakulam, Kerala, 682020', headerTextX, headerY + 24);

        // --- 2. INVOICE TITLE & ARROW ---
        const titleY = 130;

        doc.font(fonts.bold).fontSize(36).fillColor(colors.black)
            .text('Invoice', startX, titleY);

        // --- FIXED ARROW (South-West / Down-Left) ---
        doc.save();
        // Move to top-right area
        doc.translate(endX - 25, titleY + 5);
        doc.lineWidth(1.5).strokeColor(colors.black);

        // Draw diagonal line from Top-Right (20,0) to Bottom-Left (0,20)
        doc.moveTo(20, 0).lineTo(0, 20).stroke();

        // Draw Arrowhead at Bottom-Left (0,20)
        // Line going Up
        doc.moveTo(0, 20).lineTo(0, 0).stroke();
        // Line going Right
        doc.moveTo(0, 20).lineTo(20, 20).stroke();
        doc.restore();

        // Horizontal Line
        doc.moveTo(startX, titleY + 45).lineTo(endX, titleY + 45).lineWidth(1).strokeColor(colors.black).stroke();

        // --- 3. META INFO ---
        const metaY = titleY + 65;

        // Left Side: Date & No
        const labelX = startX;
        const valueX = startX + 70;

        doc.font(fonts.bold).fontSize(10).fillColor(colors.black);
        doc.text('Date :', labelX, metaY);
        doc.text('Invoice No.', labelX, metaY + 16);

        const dateStr = new Date(bill.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        doc.font(fonts.regular)
            .text(dateStr, valueX, metaY)
            .text(bill.billNumber, valueX, metaY + 16);

        // --- RIGHT SIDE CONTACT (FIXED ALIGNMENT) ---
        // 1. Calculate Positions
        // We want the ICONS to end exactly at 'endX'
        // Icons are roughly 10px wide.
        const iconWidth = 12;
        const iconX = endX - iconWidth;

        // Text ends before the icon starts
        const textRightEdge = iconX - 8;
        const textWidth = 100;
        const textX = textRightEdge - textWidth;

        // Right: Contact Info (Text and Icons)
        // Adjust alignment to include icons
        const iconSize = 10;
        const iconX_new = 535; // Far right position for icons
        const textRightAlign = 525; // Text ends before icon

        // Phone Text
        doc.font(fonts.bold).fontSize(10)
            .text('9526217009', 350, metaY, { align: 'right', width: textRightAlign - 350 });



        // Website Text
        doc.font(fonts.regular).fontSize(10)
            .text('www.mellou.in', 350, metaY + 15, { align: 'right', width: textRightAlign - 350 });





        // --- 4. BILL TO ---
        const billToY = metaY + 50;
        doc.font(fonts.bold).fontSize(10).fillColor(colors.black)
            .text('Billed to:', startX, billToY);

        doc.y = billToY + 20;

        doc.font(fonts.regular).fontSize(10);
        doc.text(bill.client.name, startX);
        doc.moveDown(0.2);
        doc.text(bill.client.address || '', startX, doc.y, { width: 300, align: 'left', lineGap: 2 });
        doc.moveDown(0.5);
        doc.text(bill.client.phone || '', startX, doc.y);

        // --- 5. MAIN TABLE ---
        let tableTop = doc.y + 25;
        if (tableTop < billToY + 80) tableTop = billToY + 80;

        const colDesc = startX + 10;
        const colQty = 340;
        const colPrice = 410;
        const colTotal = 480;

        // Header
        const headerHeight = 25;
        doc.rect(startX, tableTop, contentWidth, headerHeight).fill(colors.black);

        doc.fillColor(colors.white).font(fonts.bold).fontSize(9);
        doc.text('DESCRIPTION', colDesc, tableTop + 8);
        doc.text('QUANTITY', colQty, tableTop + 8, { width: 60, align: 'center' });
        doc.text('PRICE', colPrice, tableTop + 8, { width: 60, align: 'right' });
        doc.text('TOTAL', colTotal, tableTop + 8, { width: 55, align: 'right' });

        // Items
        let currentY = tableTop + headerHeight + 15;
        doc.fillColor(colors.black).font(fonts.regular).fontSize(10);

        bill.items.forEach(item => {
            const total = item.quantity * item.price;

            if (currentY > 700) { doc.addPage(); currentY = 50; }

            doc.text(item.name, colDesc, currentY, { width: 250 });
            doc.text(item.quantity, colQty, currentY, { width: 60, align: 'center' });
            doc.text(formatCurrency(item.price), colPrice, currentY, { width: 60, align: 'right' });
            doc.text(formatCurrency(total), colTotal, currentY, { width: 55, align: 'right' });
            currentY += 25;
        });

        currentY += 10;
        doc.moveTo(startX, currentY).lineTo(endX, currentY).lineWidth(0.5).strokeColor(colors.lightGray).stroke();
        currentY += 15;

        // Totals
        const totalsLabelX = 350;
        const totalsValX = 435;
        const totalsValWidth = 100;

        if (currentY > 650) { doc.addPage(); currentY = 50; }

        doc.font(fonts.regular).fontSize(10);
        doc.text('Subtotal:', totalsLabelX, currentY, { align: 'right', width: 80 });
        doc.text(formatCurrency(bill.totalAmount), totalsValX, currentY, { align: 'right', width: totalsValWidth });
        currentY += 20;

        const taxVal = (bill.totalAmount * 0.025).toFixed(2);
        doc.text('Tax (2.5%):', totalsLabelX, currentY, { align: 'right', width: 80 });
        doc.text(formatCurrency(taxVal), totalsValX, currentY, { align: 'right', width: totalsValWidth });
        currentY += 20;

        doc.text('Tax (2.5%):', totalsLabelX, currentY, { align: 'right', width: 80 });
        doc.text(formatCurrency(taxVal), totalsValX, currentY, { align: 'right', width: totalsValWidth });
        currentY += 25;

        doc.font(fonts.bold).fontSize(12);
        doc.text('Grand Total:', totalsLabelX, currentY, { align: 'right', width: 80 });
        doc.text(formatCurrency(bill.finalAmount), totalsValX, currentY, { align: 'right', width: totalsValWidth });
        currentY += 25;

        doc.rect(startX, tableTop, contentWidth, currentY - tableTop).lineWidth(1).strokeColor(colors.black).stroke();

        // --- 6. PAYMENT INFO ---
        if (currentY > 650) { doc.addPage(); currentY = 50; }

        const payBoxY = currentY + 20;
        const payBoxHeight = 85;

        doc.rect(startX, payBoxY, contentWidth, payBoxHeight).lineWidth(1).strokeColor(colors.black).stroke();
        doc.font(fonts.bold).fontSize(10).fillColor(colors.black)
            .text('PAYMENT INFO', startX + 15, payBoxY + 15);

        const bankY = payBoxY + 35;
        const lh = 15;
        doc.font(fonts.bold).fontSize(9);
        doc.text(`•   Account Name: Mellou`, startX + 15, bankY);
        doc.text(`•   Account No: 50200085316071`, startX + 15, bankY + lh);
        doc.text(`•   IFSC Code: HDFC0000295`, startX + 15, bankY + lh * 2);

        // --- 7. FOOTER ---
        const footerY = payBoxY + payBoxHeight + 30;
        doc.font(fonts.bold).fontSize(16).fillColor(colors.black)
            .text('THANK YOU FOR', startX, footerY)
            .text('YOUR BUSINESS', startX, footerY + 20);

        // --- 8. PURPLE BAR ---
        doc.rect(0, 841.89 - 15, 595.28, 15).fill(colors.primary);

        doc.end();

    } catch (err) {
        console.error(err);
        if (!res.headersSent) res.status(500).json({ message: err.message });
    }
};