// Complete India Location Hierarchy for BloodGuard
// State -> District -> City
// Fixed Country: India (No country dropdown)

const LOCATION_DATA = {
  states: [
    {
      name: "Tamil Nadu",
      districts: [
        {
          name: "Chennai",
          cities: ["Chennai"],
        },
        {
          name: "Coimbatore",
          cities: ["Coimbatore", "Mettupalayam", "Pollachi"],
        },
        {
          name: "Madurai",
          cities: ["Madurai", "Thoppur", "Balarengapuram"],
        },
        {
          name: "Salem",
          cities: ["Salem", "Mettur", "Attur", "Edappadi"],
        },
        {
          name: "Krishnagiri",
          cities: ["Hosur", "Krishnagiri"],
        },
        {
          name: "Erode",
          cities: ["Erode", "Bhavani", "Gobichettipalayam"],
        },
        {
          name: "Thanjavur",
          cities: ["Thanjavur", "Kumbakonam"],
        },
        {
          name: "Tiruchirappalli",
          cities: ["Tiruchirappalli", "Srirangam"],
        },
      ],
    },
    {
      name: "Karnataka",
      districts: [
        {
          name: "Bengaluru Urban",
          cities: ["Bengaluru"],
        },
        {
          name: "Mysuru",
          cities: ["Mysuru"],
        },
        {
          name: "Dakshina Kannada",
          cities: ["Mangaluru"],
        },
        {
          name: "Dharwad",
          cities: ["Hubballi-Dharwad", "Hubballi", "Dharwad"],
        },
        {
          name: "Belagavi",
          cities: ["Belagavi"],
        },
        {
          name: "Kalaburagi",
          cities: ["Kalaburagi"],
        },
        {
          name: "Shivamogga",
          cities: ["Shivamogga"],
        },
        {
          name: "Davanagere",
          cities: ["Davanagere"],
        },
      ],
    },
    {
      name: "Kerala",
      districts: [
        {
          name: "Thiruvananthapuram",
          cities: ["Thiruvananthapuram"],
        },
        {
          name: "Ernakulam",
          cities: ["Kochi", "Kalamassery"],
        },
        {
          name: "Kozhikode",
          cities: ["Kozhikode"],
        },
        {
          name: "Thrissur",
          cities: ["Thrissur", "Mulankunnathukavu"],
        },
        {
          name: "Kollam",
          cities: ["Kollam", "Parippally"],
        },
        {
          name: "Kannur",
          cities: ["Kannur", "Pariyaram"],
        },
        {
          name: "Kottayam",
          cities: ["Kottayam"],
        },
        {
          name: "Palakkad",
          cities: ["Palakkad"],
        },
      ],
    },
    {
      name: "Andhra Pradesh",
      districts: [
        {
          name: "Visakhapatnam",
          cities: ["Visakhapatnam"],
        },
        {
          name: "NTR District",
          cities: ["Vijayawada"],
        },
        {
          name: "Guntur",
          cities: ["Guntur", "Mangalagiri"],
        },
        {
          name: "Tirupati",
          cities: ["Tirupati"],
        },
        {
          name: "Kurnool",
          cities: ["Kurnool"],
        },
        {
          name: "Sri Potti Sriramulu Nellore",
          cities: ["Nellore"],
        },
        {
          name: "East Godavari",
          cities: ["Rajamahendravaram"],
        },
        {
          name: "Kakinada",
          cities: ["Kakinada"],
        },
        {
          name: "Dr. B.R. Ambedkar Konaseema",
          cities: ["Amalapuram"],
        },
      ],
    },
    {
      name: "Telangana",
      districts: [
        {
          name: "Hyderabad",
          cities: ["Hyderabad", "Secunderabad"],
        },
        {
          name: "Warangal",
          cities: ["Warangal", "Hanamkonda"],
        },
        {
          name: "Karimnagar",
          cities: ["Karimnagar"],
        },
        {
          name: "Nizamabad",
          cities: ["Nizamabad"],
        },
        {
          name: "Khammam",
          cities: ["Khammam"],
        },
        {
          name: "Nalgonda",
          cities: ["Nalgonda", "Miryalaguda"],
        },
        {
          name: "Mahabubnagar",
          cities: ["Mahabubnagar", "Jadcherla"],
        },
        {
          name: "Siddipet",
          cities: ["Siddipet", "Gajwel", "Husnabad", "Dubbak"],
        },
      ],
    },
  ],
};

module.exports = { LOCATION_DATA };
