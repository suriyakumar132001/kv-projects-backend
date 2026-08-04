const invoiceTemplate = (invoice) => {
  const items = invoice.quotation?.items || [];

  return `
<!DOCTYPE html>
<html>

<head>

<meta charset="UTF-8">

<style>

*{
margin:0;
padding:0;
box-sizing:border-box;
}

body{

font-family:Arial,Helvetica,sans-serif;
padding:35px;
background:#fff;
color:#333;
font-size:14px;

}

.header{

display:flex;
justify-content:space-between;
align-items:flex-start;
border-bottom:4px solid #1E40AF;
padding-bottom:20px;
margin-bottom:25px;

}

.company{

width:60%;

}

.company h1{

font-size:30px;
color:#1E40AF;
margin-bottom:8px;

}

.company p{

line-height:22px;

}

.invoice{

text-align:right;

}

.invoice h2{

font-size:34px;
color:#1E40AF;

}

.invoice p{

margin-top:10px;
line-height:22px;

}

.customer{

display:flex;
justify-content:space-between;
background:#F8FAFC;
padding:20px;
border-left:5px solid #1E40AF;
margin-bottom:25px;

}

.bill{

width:60%;

}

.bill h3{

margin-bottom:10px;
color:#1E40AF;

}

.bill p{

line-height:23px;

}

.status{

text-align:right;

}

.status h3{

margin-bottom:10px;

}

.status span{

padding:8px 15px;
border-radius:20px;
background:${
invoice.paymentStatus==="Paid"
?"#16A34A"
:invoice.paymentStatus==="Partial"
?"#F59E0B"
:"#DC2626"
};

color:white;
font-weight:bold;

}

table{

width:100%;
border-collapse:collapse;
margin-top:20px;

}

thead{

background:#1E40AF;
color:white;

}

th{

padding:14px;

}

td{

padding:12px;
border:1px solid #ddd;

}

tbody tr:nth-child(even){

background:#f8fafc;

}

.summary{

margin-top:35px;
width:360px;
margin-left:auto;

}

.summary table{

width:100%;

}

.summary td{

padding:10px;

}

.summary tr:last-child{

background:#1E40AF;
color:white;
font-size:17px;

}

.bank{

margin-top:35px;
background:#f4f6fb;
padding:18px;
border-radius:8px;

}

.bank h3{

margin-bottom:10px;
color:#1E40AF;

}

.bank p{

line-height:24px;

}

.footer{

margin-top:60px;
border-top:2px solid #ddd;
padding-top:20px;

}

.signature{

margin-top:50px;
text-align:right;

}

.signature hr{

width:220px;
margin-left:auto;
margin-bottom:8px;

}

</style>

</head>

<body>

<div class="header">

<div class="company">

<h1>KV PROJECTS PRIVATE LIMITED</h1>

<p>

No.12, Anna Nagar, Chennai - 600040

<br>

GSTIN : 33ABCDE1234F1Z5

<br>

Phone : +91 9876543210

<br>

Email : info@kvprojects.com

</p>

</div>

<div class="invoice">

<h2>TAX INVOICE</h2>

<p>

Invoice No :
<b>${invoice.invoiceNumber}</b>

<br>

Invoice Date :
${new Date(invoice.invoiceDate).toLocaleDateString()}

<br>

Due Date :
${new Date(invoice.dueDate).toLocaleDateString()}

</p>

</div>

</div>

<div class="customer">

<div class="bill">

<h3>Bill To</h3>

<p>

<b>Client :</b>
${invoice.client?.clientName || "Customer"}

<br>

<b>Company :</b>
${invoice.client?.companyName || "-"}

<br>

<b>Email :</b>
${invoice.client?.email || "-"}

<br>

<b>Phone :</b>
${invoice.client?.phone || "-"}

<br>

<b>Project :</b>
${invoice.projectName}

</p>

</div>

<div class="status">

<h3>Payment</h3>

<span>${invoice.paymentStatus}</span>

</div>

</div>

<table>

<thead>

<tr>

<th>Description</th>

<th>Quantity</th>

<th>Unit Price</th>

<th>Total</th>

</tr>

</thead>

<tbody>

${
items.length
? items.map(item=>`
<tr>

<td>${item.description}</td>

<td>${item.quantity}</td>

<td>₹ ${item.unitPrice}</td>

<td>₹ ${item.total}</td>

</tr>
`).join("")
:
`
<tr>

<td colspan="4" style="text-align:center;">
No Items
</td>

</tr>
`
}

</tbody>

</table>

<div class="summary">

<table>

<tr>

<td><b>Subtotal</b></td>

<td style="text-align:right;">₹ ${invoice.subtotal}</td>

</tr>

<tr>

<td>CGST (9%)</td>

<td style="text-align:right;">₹ ${(invoice.tax / 2).toFixed(2)}</td>

</tr>

<tr>

<td>SGST (9%)</td>

<td style="text-align:right;">₹ ${(invoice.tax / 2).toFixed(2)}</td>

</tr>

<tr>

<td>Discount</td>

<td style="text-align:right;">₹ ${invoice.discount}</td>

</tr>

<tr>

<td><b>Grand Total</b></td>

<td style="text-align:right;"><b>₹ ${invoice.grandTotal}</b></td>

</tr>

</table>

</div>

<div class="bank">

<h3>Bank Details</h3>

<p>

<b>Bank Name :</b> State Bank of India

<br>

<b>Account Name :</b> KV PROJECTS PRIVATE LIMITED

<br>

<b>Account Number :</b> 123456789012

<br>

<b>IFSC :</b> SBIN0001234

<br>

<b>UPI :</b> kvprojects@okicici

</p>

</div>

<div style="margin-top:30px;">

<h3 style="color:#1E40AF;">Terms & Conditions</h3>

<ul style="margin-top:10px;padding-left:20px;line-height:26px;">

<li>Goods once sold cannot be returned.</li>

<li>Payment should be made on or before the due date.</li>

<li>Interest may be charged on overdue invoices.</li>

<li>This invoice is generated electronically.</li>

</ul>

</div>

<div class="footer">

<p>

Thank you for choosing <b>KV PROJECTS PRIVATE LIMITED</b>.

</p>

<p>

We appreciate your business and look forward to working with you again.

</p>

<div class="signature">

<p>For KV PROJECTS PRIVATE LIMITED</p>

<br>

<hr>

<b>Authorized Signatory</b>

</div>

</div>

</body>

</html>

`;
};

module.exports = invoiceTemplate;