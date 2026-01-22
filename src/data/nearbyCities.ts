// Geographic clusters for nearby city recommendations
// Each city maps to 3-5 nearby cities that users might also search for

export const nearbyCities: Record<string, string[]> = {
  // Northern Utah Cluster
  'logan': ['brigham-city', 'ogden', 'layton'],
  'brigham-city': ['logan', 'ogden', 'roy'],

  // Ogden Area Cluster
  'ogden': ['roy', 'layton', 'clearfield', 'brigham-city'],
  'roy': ['ogden', 'layton', 'clearfield'],
  'layton': ['ogden', 'roy', 'clearfield', 'farmington'],
  'clearfield': ['layton', 'roy', 'ogden', 'farmington'],
  'farmington': ['layton', 'clearfield', 'bountiful'],
  'bountiful': ['farmington', 'salt-lake-city', 'layton'],

  // Salt Lake City Metro Cluster
  'salt-lake-city': ['murray', 'sandy', 'west-valley-city', 'south-jordan'],
  'murray': ['salt-lake-city', 'sandy', 'south-jordan', 'west-jordan'],
  'sandy': ['murray', 'salt-lake-city', 'south-jordan', 'west-jordan'],
  'west-valley-city': ['salt-lake-city', 'west-jordan', 'murray'],
  'west-jordan': ['south-jordan', 'sandy', 'murray', 'west-valley-city'],
  'south-jordan': ['west-jordan', 'sandy', 'murray', 'lehi'],

  // Utah County Cluster
  'provo': ['orem', 'lehi', 'spanish-fork'],
  'orem': ['provo', 'lehi', 'spanish-fork'],
  'lehi': ['south-jordan', 'orem', 'provo'],

  // Mountain Resort
  'park-city': ['salt-lake-city', 'sandy', 'murray'],

  // Southern Utah
  'st-george': ['cedar-city', 'washington'],

  // Nevada Cities
  'las-vegas': ['henderson', 'reno'],
  'henderson': ['las-vegas', 'reno'],
  'reno': ['las-vegas', 'henderson'],
};
