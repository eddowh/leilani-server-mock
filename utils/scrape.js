let tableBody = document.querySelector('.innerpage_bg_cell').querySelector('table tbody');

let links = tableBody.childNodes[2].getElementsByTagName('a');
let priceCells = tableBody.getElementsByClassName('smalltext');

let productImages = []
for (let link of links) {
	let images = link.getElementsByTagName('img');
	if (images.length > 0) {
		let image = images[0];
		if (image.alt) productImages.push(image);
	}
}

let prices = [];
for (let cell of priceCells) {
	let price = parseInt(cell.textContent.strip().split(' ')[1].replace('.', ''));
	prices.push(price);
}

let startingId = 14;
let categories = ['ftd-exclusives']
let occasions = [];

let products = [];
for (let i = 0; i < productImages.length; i++) {
	let image = productImages[i];
	let price = prices[i];
	let product = {
		"id": startingId + i,
		"name": image.alt,
		"price": price,
		"image_small": image.src,
		"categories": categories,
		"occasions": occasions,
	};
	// console.log(product);
	products.push(product);
}

console.log(JSON.stringify(products));
console.log(startingId + products.length);