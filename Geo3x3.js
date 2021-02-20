/*
	Geo3x3 ver 1.03
		what is Geo3x3
			geo zone encoding
		creator
			Taisuke Fukuno
			http://fukuno.jig.jp/2012/geo3x3
		licence
			CC0
			https://creativecommons.jp/sciencecommons/aboutcc0/
		doc
			recursive divisiton 3x3(9th)
				       East  West
				North 1 2 3 1 2 3
				      4 5 6 4 5 6
				South 7 8 9 7 8 9
				(0 = dummy)
				origin = lat 90, lng 0 -> lat -90, lng 90(E) -90(W)
			divide the earth to two (West or East)
				W5555555 = level 8
				E1384700 = level 6
				longer is more in detail
		history
			ver 1.03 2021.2.20 support int encoded, license CC BY -> CC0 (Public Domain)
			ver 1.02 2013.2.18 add Java version, lincense CC BY-ND -> CC BY
			ver 1.01 2012.1.15 change coding
			ver 1.00 2012.1.15 first release
*/

class Geo3x3 {
	static encode(lat, lng, level) {
		if (level < 1) {
			return "";
		}
		let res = "E";
		if (lng < 0) {
			res = "W";
			lng += 180;
		}
		lat = 90 - lat; // 0:the North Pole,  180:the South Pole
		let unit = 180;
		for (let i = 1; i < level; i++) {
			unit /= 3;
			const x = Math.floor(lng / unit);
			const y = Math.floor(lat / unit);
			res += x + y * 3 + 1;
			lng -= x * unit;
			lat -= y * unit;
		}
		return res;
	}
	static decode(code) {
		if (code === null || code == undefined) {
			return null;
		}
		if (typeof code === "number" || (typeof code == "string" && parseInt(code) == code)) {
			if (code < 0) {
				code = "W" + -code;
			} else {
				code = "E" + code;
			}
		} else if (code.length == 0) {
			return null;
		}
		const flg = code.charAt(0) == "W";
		let unit = 180;
		let lat = 0;
		let lng = 0;
		let level = 1;
		for (let i = 1; i < code.length; i++) {
			let n = "0123456789".indexOf(code.charAt(i));
			if (n == 0) {
				break;
			}
			unit /= 3;
			n--;
			lng += (n % 3) * unit;
			lat += Math.floor(n / 3) * unit;
			level++;
		}
		lat += unit / 2;
		lng += unit / 2;
		lat = 90 - lat;
		if (flg) {
			lng -= 180;
		}
		return { lat, lng, level, unit };
	}
	static getCoords(code) {
		const pos = this.decode(code);
		const x = pos.lng;
		const y = pos.lat;
		const u2 = pos.unit / 2;
		return [
			{ "lat" : y - u2, "lng" : x - u2 },
			{ "lat" : y - u2, "lng" : x + u2 },
			{ "lat" : y + u2, "lng" : x + u2 },
			{ "lat" : y + u2, "lng" : x - u2 }
		];
	}
	static getMeshSize(code) { // m
		const lls = this.getCoords(code);
		const xy = new Array(4);
		for (let i = 0; i < xy.length; i++) {
			xy[i] = this.ll2xy(lls[i].lat, lls[i].lng);
		}
		const x = xy[1].x - xy[0].x;
		const y = xy[2].y - xy[1].y;
		return { x, y };
	}
	static R2_EARTH = 12756274; // m from https://ja.wikipedia.org/wiki/%E5%9C%B0%E7%90%83
	static RPI_EARTH = this.R2_EARTH * Math.PI / 2 / 180;
	static ll2xy(lat, lng) {
		const x = this.RPI_EARTH * lng;
		const y = this.RPI_EARTH * Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
		return { x, y };
	}
	static xy2ll(x, y) {
		const lng = x / this.RPI_EARTH;
		let lat = y / this.RPI_EARTH;
		lat = 180 / Math.PI * (2 * Math.atan(Math.exp(lat * Math.PI / 180)) - Math.PI / 2);
		return { lat, lng };
	}
}

export { Geo3x3 };
