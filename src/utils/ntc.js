/**
 * ntc.js – Name That Color (offline lookup)
 * Finds the nearest human-readable name for any hex color using
 * Euclidean distance in RGB space with a curated list of ~200 named colors.
 */

// [hex, name] pairs — curated mix of artist colors + CSS named colors
const NAME_LIST = [
    ['#000000', 'Black'],
    ['#1C1C1E', 'Mars Black'],
    ['#1a1a2e', 'Dark Navy'],
    ['#2C2C2C', 'Charcoal'],
    ['#3b3b3b', 'Dark Slate'],
    ['#4a4a4a', 'Graphite'],
    ['#696969', 'Dim Gray'],
    ['#808080', 'Gray'],
    ['#A9A9A9', 'Dark Gray'],
    ['#C0C0C0', 'Silver'],
    ['#D3D3D3', 'Light Gray'],
    ['#F5F5F5', 'White Smoke'],
    ['#F2F0EC', 'Titanium White'],
    ['#FFFFFF', 'Pure White'],
    // Reds
    ['#8B0000', 'Dark Red'],
    ['#A00000', 'Alizarin Crimson'],
    ['#B22222', 'Firebrick'],
    ['#C0392B', 'Pompeii Red'],
    ['#DC143C', 'Crimson'],
    ['#E8291C', 'Cadmium Red'],
    ['#E83B3B', 'Red'],
    ['#F08080', 'Light Coral'],
    ['#FF4500', 'Orange Red'],
    ['#FF6347', 'Tomato'],
    ['#FF7F7F', 'Salmon Pink'],
    ['#FFB6C1', 'Light Pink'],
    ['#FFC0CB', 'Pink'],
    ['#FF69B4', 'Hot Pink'],
    ['#FF1493', 'Deep Pink'],
    // Oranges
    ['#8B4513', 'Saddle Brown'],
    ['#A0522D', 'Sienna'],
    ['#B8490B', 'Burnt Sienna'],
    ['#CD853F', 'Peru'],
    ['#D2691E', 'Chocolate'],
    ['#E07B39', 'Orange Ochre'],
    ['#E8731A', 'Burnt Orange'],
    ['#FF8C00', 'Dark Orange'],
    ['#FFA500', 'Orange'],
    ['#FFB300', 'Amber'],
    ['#FFA07A', 'Light Salmon'],
    // Yellows
    ['#8B6914', 'Dark Goldenrod'],
    ['#B8860B', 'Dark Goldenrod'],
    ['#BDB76B', 'Dark Khaki'],
    ['#C4922A', 'Yellow Ochre'],
    ['#D4A017', 'Goldenrod'],
    ['#DAA520', 'Goldenrod'],
    ['#E6C32A', 'Cadmium Yellow'],
    ['#F0E68C', 'Khaki'],
    ['#FFD700', 'Gold'],
    ['#FFFF00', 'Yellow'],
    ['#FFFFE0', 'Light Yellow'],
    ['#F5F5DC', 'Beige'],
    ['#FAEBD7', 'Antique White'],
    ['#FAF0E6', 'Linen'],
    // Greens
    ['#006400', 'Dark Forest Green'],
    ['#013220', 'Dark Green'],
    ['#228B22', 'Forest Green'],
    ['#2E8B57', 'Sea Green'],
    ['#32CD32', 'Lime Green'],
    ['#3CB371', 'Medium Sea Green'],
    ['#4CAF50', 'Green'],
    ['#5F9EA0', 'Cadet Blue Green'],
    ['#66CDAA', 'Medium Aquamarine'],
    ['#6B8E23', 'Olive Drab'],
    ['#7CFC00', 'Lawn Green'],
    ['#7FFF00', 'Chartreuse'],
    ['#808000', 'Olive'],
    ['#8FBC8F', 'Dark Sea Green'],
    ['#90EE90', 'Light Green'],
    ['#9ACD32', 'Yellow Green'],
    ['#ADFF2F', 'Green Yellow'],
    ['#00FF00', 'Lime'],
    ['#00FF7F', 'Spring Green'],
    ['#00FA9A', 'Medium Spring Green'],
    ['#20B2AA', 'Light Sea Green'],
    ['#40E0D0', 'Turquoise'],
    ['#48D1CC', 'Medium Turquoise'],
    // Cyans / Teals
    ['#00FFFF', 'Cyan'],
    ['#00CED1', 'Dark Turquoise'],
    ['#008080', 'Teal'],
    ['#008B8B', 'Dark Cyan'],
    ['#20B2AA', 'Light Sea Green'],
    ['#5F9EA0', 'Cadet Blue'],
    ['#7FFFD4', 'Aquamarine'],
    ['#B0E0E6', 'Powder Blue'],
    ['#ADD8E6', 'Light Blue'],
    ['#87CEEB', 'Sky Blue'],
    ['#87CEFA', 'Light Sky Blue'],
    // Blues
    ['#000080', 'Navy'],
    ['#00008B', 'Dark Blue'],
    ['#0000CD', 'Medium Blue'],
    ['#0000FF', 'Blue'],
    ['#1B3F8B', 'Ultramarine'],
    ['#191970', 'Midnight Blue'],
    ['#1E90FF', 'Dodger Blue'],
    ['#2196F3', 'Material Blue'],
    ['#27408B', 'Royal Blue Dark'],
    ['#33A1C9', 'Cerulean'],
    ['#4169E1', 'Royal Blue'],
    ['#4682B4', 'Steel Blue'],
    ['#5C8ACC', 'Cobalt Blue'],
    ['#6495ED', 'Cornflower Blue'],
    ['#7B9CD0', 'Periwinkle'],
    ['#87CEFA', 'Light Sky Blue'],
    ['#ADD8E6', 'Light Blue'],
    ['#B0C4DE', 'Light Steel Blue'],
    ['#B3CCE8', 'Pale Blue'],
    ['#CAE1FF', 'Light Blue Lavender'],
    // Purples / Violets
    ['#4B0082', 'Indigo'],
    ['#6A0DAD', 'Dark Violet'],
    ['#7B3F9E', 'Dioxazine Purple'],
    ['#7c6af7', 'Medium Purple'],
    ['#800080', 'Purple'],
    ['#8B008B', 'Dark Magenta'],
    ['#8A2BE2', 'Blue Violet'],
    ['#9370DB', 'Medium Purple'],
    ['#9400D3', 'Dark Violet'],
    ['#9932CC', 'Dark Orchid'],
    ['#A020F0', 'Purple Violet'],
    ['#BA55D3', 'Medium Orchid'],
    ['#DA70D6', 'Orchid'],
    ['#DDA0DD', 'Plum'],
    ['#E6E6FA', 'Lavender'],
    ['#EE82EE', 'Violet'],
    ['#FF00FF', 'Magenta'],
    ['#FF77FF', 'Fuchsia Light'],
    ['#FFB3FF', 'Light Magenta'],
    // Browns / Earth tones
    ['#3C1810', 'Burnt Umber'],
    ['#4E2728', 'Dark Brown'],
    ['#5C3317', 'Dark Brown'],
    ['#7B4F2E', 'Brown Ochre'],
    ['#8B4513', 'Saddle Brown'],
    ['#954535', 'Chestnut'],
    ['#A0522D', 'Sienna'],
    ['#A67B5B', 'Raw Sienna'],
    ['#A69258', 'Raw Umber'],
    ['#B5651D', 'Saddle Brown Light'],
    ['#C4A882', 'Desert Sand'],
    ['#D2B48C', 'Tan'],
    ['#DBBF94', 'Wheat Dark'],
    ['#DEB887', 'Burlywood'],
    ['#F5DEB3', 'Wheat'],
    ['#FFDEAD', 'Navajo White'],
    ['#FFE4B5', 'Moccasin'],
    ['#FFE4C4', 'Bisque'],
    ['#FFEBCD', 'Blanched Almond'],
    // Special paint colors
    ['#1E5945', 'Phthalo Green'],
    ['#00746F', 'Viridian'],
    ['#003153', 'Prussian Blue'],
    ['#B01B2E', 'Venetian Red'],
    ['#CF6F2A', 'Indian Yellow'],
    ['#E8C76B', 'Naples Yellow'],
    ['#F7E7CE', 'Champagne'],
    ['#E6D5AC', 'Buff Titanium'],
    ['#7B9070', 'Sap Green'],
    ['#D4AF37', 'Gold Ochre'],
]

/**
 * Find the nearest named color for a given hex string.
 * @param {string} hex - e.g. '#FF5733'
 * @returns {{ name: string, hex: string, distance: number }}
 */
export function nameColor(hex) {
    if (!hex || hex.length < 4) return { name: 'Unknown', hex, distance: 999 }

    let r, g, b
    try {
        const h = hex.replace('#', '')
        if (h.length === 3) {
            r = parseInt(h[0] + h[0], 16)
            g = parseInt(h[1] + h[1], 16)
            b = parseInt(h[2] + h[2], 16)
        } else {
            r = parseInt(h.slice(0, 2), 16)
            g = parseInt(h.slice(2, 4), 16)
            b = parseInt(h.slice(4, 6), 16)
        }
    } catch {
        return { name: 'Unknown', hex, distance: 999 }
    }

    let best = null
    let bestDist = Infinity

    for (const [nhex, name] of NAME_LIST) {
        const nh = nhex.replace('#', '')
        const nr = parseInt(nh.slice(0, 2), 16)
        const ng = parseInt(nh.slice(2, 4), 16)
        const nb = parseInt(nh.slice(4, 6), 16)
        // Weighted RGB distance (human eye sensitivity)
        const dist = Math.sqrt(
            2 * (r - nr) ** 2 + 4 * (g - ng) ** 2 + 3 * (b - nb) ** 2
        )
        if (dist < bestDist) {
            bestDist = dist
            best = { name, hex: nhex, distance: Math.round(dist) }
        }
    }

    return best || { name: 'Unknown', hex, distance: 999 }
}
