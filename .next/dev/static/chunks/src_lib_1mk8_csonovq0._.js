(()=>{"use strict";(globalThis["TURBOPACK"] || (globalThis["TURBOPACK"] = [])).push([typeof document === "object" ? document.currentScript : undefined,
"[project]/src/lib/data.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "BADGES",
    ()=>BADGES,
    "CATALOG",
    ()=>CATALOG,
    "INTERESTS",
    ()=>INTERESTS,
    "METAL_BONUS",
    ()=>METAL_BONUS,
    "METAL_LABEL",
    ()=>METAL_LABEL,
    "NEWS_SECTIONS",
    ()=>NEWS_SECTIONS,
    "PROFILES",
    ()=>PROFILES,
    "RETURN_TRIP",
    ()=>RETURN_TRIP,
    "ROW_TITLES",
    ()=>ROW_TITLES,
    "SHOP_ITEMS",
    ()=>SHOP_ITEMS,
    "TIERS",
    ()=>TIERS,
    "itemById",
    ()=>itemById,
    "tierColour",
    ()=>tierColour,
    "tierIndex",
    ()=>tierIndex
]);
const INTERESTS = [
    {
        id: "cricket",
        label: "Cricket"
    },
    {
        id: "world-news",
        label: "World news"
    },
    {
        id: "business-news",
        label: "Business news"
    },
    {
        id: "indian-cinema",
        label: "Indian cinema"
    },
    {
        id: "drama",
        label: "Drama series"
    },
    {
        id: "new-films",
        label: "New films"
    },
    {
        id: "japanese-film",
        label: "Japanese film"
    },
    {
        id: "animation",
        label: "Animation"
    },
    {
        id: "travel-food",
        label: "Travel and food"
    },
    {
        id: "k-drama",
        label: "Korean drama"
    }
];
const PROFILES = {
    anil: {
        id: "anil",
        name: "Anil Mathur",
        formal: "Mr Mathur",
        first: "Anil",
        initials: "AM",
        memberNo: "1702 448 915",
        tier: "Diamond",
        memberSince: "2004",
        asiaMiles: 486250,
        flightPoints: 2315,
        nextTier: "Diamond Exec",
        yearEnds: "31 Dec 2026",
        percentiles: [
            {
                line: "Top 1% of Hong Kong to Delhi flyers",
                detail: "By flights on the route this year"
            },
            {
                line: "Top 3% of Diamond members",
                detail: "By distance flown this year"
            },
            {
                line: "Top 0.3% of all members",
                detail: "Million Miler pin holders"
            }
        ],
        friends: [
            {
                name: "Mei Ling Tsang",
                role: "CFO, logistics",
                tier: "Diamond",
                pins: 11,
                flights: 71,
                topPin: "Jade Century"
            },
            {
                name: "Rahul Kapoor",
                role: "Sales director",
                tier: "Gold",
                pins: 7,
                flights: 44,
                topPin: "Moonshot"
            },
            {
                name: "Priya Nair",
                role: "Partner, law firm",
                tier: "Diamond",
                pins: 9,
                flights: 58,
                topPin: "Million Miler"
            },
            {
                name: "James Whitfield",
                role: "Buyer, retail",
                tier: "Silver",
                pins: 5,
                flights: 23,
                topPin: "Four Continents"
            }
        ],
        about: "Managing director, textiles export. Hong Kong based. Flies to Delhi most weeks.",
        trip: {
            flight: "CX695",
            from: "HKG",
            fromCity: "Hong Kong",
            to: "DEL",
            toCity: "Delhi",
            date: "Thu 15 Oct",
            dep: "20:05",
            arr: "23:20",
            duration: "5h 45m",
            durationMin: 345,
            distanceKm: 3770,
            cabin: "Business",
            seat: "11A",
            aircraft: "Airbus A350-900",
            gate: "Gate 23",
            boarding: "19:25"
        },
        meals: [
            {
                id: "dal",
                name: "Dal makhani",
                detail: "Paneer tikka, jeera rice, garlic naan. Vegetarian."
            },
            {
                id: "chettinad",
                name: "Chicken Chettinad",
                detail: "Basmati rice, okra masala, cucumber raita."
            },
            {
                id: "garoupa",
                name: "Steamed garoupa",
                detail: "Ginger and spring onion, jasmine rice, choi sum."
            },
            {
                id: "beef",
                name: "Beef tenderloin",
                detail: "Potato gratin, green beans, red wine jus."
            }
        ],
        mealTimings: [
            {
                id: "early",
                label: "Straight after take-off",
                detail: "Serve first, then leave me to rest"
            },
            {
                id: "later",
                label: "When I ask",
                detail: "I will press the call button"
            },
            {
                id: "light",
                label: "Something light before landing",
                detail: "Skip the main service"
            }
        ],
        wakeOptions: [
            "Don't wake me",
            "30 min before landing",
            "45 min before landing",
            "60 min before landing"
        ],
        defaults: {
            meal: "dal",
            mealTiming: "early",
            dndAfterMeal: true,
            makeBed: true,
            wake: "45 min before landing",
            lighting: "Dim and warm",
            crew: "Keep it brief",
            seat: "Window",
            quietZone: true,
            language: "English",
            subtitles: "Off",
            interests: [
                "cricket",
                "world-news",
                "business-news",
                "indian-cinema"
            ]
        },
        continueWatching: [
            {
                itemId: "scam-1992",
                note: "Episode 4 · resumed from CX694 on 12 Oct",
                progress: 0.4
            },
            {
                itemId: "oppenheimer",
                note: "1h 52m left",
                progress: 0.38
            }
        ],
        stats: {
            year: "2026",
            flights: 62,
            km: 214860,
            hours: 318,
            countries: 7,
            airports: 11,
            nightsOnBoard: 21,
            lifetimeMiles: 1184320,
            topRoutes: [
                {
                    route: "HKG to DEL",
                    flights: 38
                },
                {
                    route: "HKG to SIN",
                    flights: 9
                },
                {
                    route: "HKG to HND",
                    flights: 7
                },
                {
                    route: "HKG to LHR",
                    flights: 6
                }
            ],
            earthLaps: "5.4",
            favouriteSeat: "11A",
            mostWatched: "Cricket, 41 hours"
        },
        badgeProgress: {
            betsy: {
                value: 1,
                earnedOn: "14 Mar 2004",
                stats: [
                    "First Cathay flight: CX101 Hong Kong to Sydney"
                ]
            },
            "new-stamp": {
                value: 3,
                earnedOn: "2 Sep 2004",
                stats: [
                    "Countries landed in so far: 19"
                ]
            },
            "set-once": {
                value: 4,
                note: "4 of 5 flights on a saved profile",
                left: "One more. CX695 tonight counts.",
                stats: [
                    "Profile saved on 1 Sep 2026",
                    "Dal makhani pre-selected on 4 of 4 flights"
                ]
            },
            "night-shift": {
                value: 4,
                note: "4 of 5 overnight flights this quarter",
                left: "One more. CX695 tonight counts.",
                stats: [
                    "Overnight flights this quarter: CX694 on 2, 5, 9 and 12 Oct",
                    "Overnight flights in 2026: 21"
                ]
            },
            "home-hub": {
                value: 100,
                earnedOn: "21 Feb 2009",
                stats: [
                    "Departures from Hong Kong: 486"
                ]
            },
            "full-innings": {
                value: 6,
                earnedOn: "27 Jun 2026",
                thisYear: true,
                stats: [
                    "Cricket watched on board in 2026: 41 hours",
                    "Most watched: Champions Trophy 2025 Final"
                ]
            },
            "lights-out": {
                value: 9,
                note: "9 of 10 overnight flights in rest mode",
                left: "One more with do not disturb on. CX695 tonight counts.",
                stats: [
                    "Average sleep on HKG to DEL: 3h 10m"
                ]
            },
            "route-regular": {
                value: 212,
                earnedOn: "6 Jun 2019",
                level: "III",
                stats: [
                    "212 flights on HKG to DEL, level III",
                    "HKG to DEL flights in 2026: 38",
                    "Most flown seat on the route: 11A"
                ]
            },
            "around-the-world": {
                value: 1,
                earnedOn: "18 Mar 2026",
                thisYear: true,
                stats: [
                    "Flown in 2026: 214,860 km, 5.4 laps of the Earth"
                ]
            },
            "four-continents": {
                value: 4,
                earnedOn: "9 May 2013",
                stats: [
                    "Asia, Europe, Oceania, North America"
                ]
            },
            "million-miler": {
                value: 1,
                earnedOn: "11 Jan 2024",
                stats: [
                    "Lifetime miles flown: 1,184,320",
                    "Of those on the 747: 212,400"
                ]
            },
            checkerboard: {
                value: 478,
                note: "478 of 500 landings in Hong Kong",
                left: "22 more. At your pace, early December.",
                stats: [
                    "Landings in Hong Kong this year: 41"
                ]
            },
            moonshot: {
                value: 1,
                earnedOn: "30 Aug 2012",
                stats: [
                    "Lifetime distance: 1.9 million km"
                ]
            },
            "over-the-top": {
                value: 0,
                left: "Fly a polar route, such as Hong Kong to New York over the Arctic.",
                stats: [
                    "Polar flights so far: none"
                ]
            },
            "jade-century": {
                value: 62,
                note: "62 of 100 flights in 2026",
                left: "38 more by 31 Dec. At your current pace you finish on 84.",
                stats: [
                    "Best year so far: 2019, 91 flights"
                ]
            }
        },
        recap: {
            slept: "3h 05m",
            watched: [
                {
                    title: "Champions Trophy 2025 Final, highlights",
                    time: "48 min"
                },
                {
                    title: "Asia Business Report",
                    time: "26 min"
                }
            ],
            meal: "Dal makhani at 20:40, eight minutes after the seatbelt sign went off",
            highlights: [
                "Not disturbed between 21:20 and 00:35",
                "Woken with tea 45 minutes before landing",
                "Seat 11A, as booked on your last 14 Delhi trips"
            ],
            yearHeadline: "You spent 13 days in the air this year",
            yearLines: [
                {
                    label: "Flights",
                    value: "63"
                },
                {
                    label: "To Delhi",
                    value: "39"
                },
                {
                    label: "Distance",
                    value: "218,630 km"
                },
                {
                    label: "Laps of the Earth",
                    value: "5.5"
                },
                {
                    label: "Cricket watched on board",
                    value: "42 hours"
                },
                {
                    label: "Dinners served straight after take-off",
                    value: "31"
                }
            ]
        }
    },
    chloe: {
        id: "chloe",
        name: "Chloe Leung",
        formal: "Ms Leung",
        first: "Chloe",
        initials: "CL",
        memberNo: "1810 377 204",
        tier: "Green",
        memberSince: "2024",
        asiaMiles: 12400,
        flightPoints: 75,
        nextTier: "Silver",
        yearEnds: "31 Dec 2026",
        percentiles: [
            {
                line: "Top 62% of Hong Kong to Osaka flyers",
                detail: "By flights on the route this year"
            },
            {
                line: "Top 40% of Green members",
                detail: "By distance flown this year"
            },
            {
                line: "Top 54% of all members",
                detail: "New Stamp pin holders"
            }
        ],
        friends: [
            {
                name: "Karen Ho",
                role: "Studio colleague",
                tier: "Green",
                pins: 2,
                flights: 3,
                topPin: "New Stamp"
            },
            {
                name: "Tom Li",
                role: "Architect",
                tier: "Silver",
                pins: 4,
                flights: 9,
                topPin: "Route Regular"
            },
            {
                name: "Sze Wan Chan",
                role: "Client, hotels",
                tier: "Gold",
                pins: 6,
                flights: 19,
                topPin: "Home Hub"
            }
        ],
        about: "Interior designer, Hong Kong. Two or three holidays a year.",
        trip: {
            flight: "CX566",
            from: "HKG",
            fromCity: "Hong Kong",
            to: "KIX",
            toCity: "Osaka",
            date: "Sat 17 Oct",
            dep: "08:50",
            arr: "13:45",
            duration: "3h 55m",
            durationMin: 235,
            distanceKm: 2480,
            cabin: "Economy",
            seat: "54K",
            aircraft: "Airbus A350-900",
            gate: "Gate 41",
            boarding: "08:10"
        },
        meals: [
            {
                id: "congee",
                name: "Congee with fish slices",
                detail: "Spring onion, ginger, you tiao."
            },
            {
                id: "eggs",
                name: "Scrambled eggs",
                detail: "Chicken sausage, hash brown, roast tomato."
            },
            {
                id: "fruit",
                name: "Fruit platter",
                detail: "Special meal (FPML). Order 24 hours ahead."
            }
        ],
        mealTimings: [
            {
                id: "wake",
                label: "Wake me for the meal",
                detail: "Even if I am asleep"
            },
            {
                id: "cart",
                label: "Whenever the cart comes",
                detail: "Standard service"
            },
            {
                id: "skip",
                label: "Don't wake me",
                detail: "Leave a snack at the seat"
            }
        ],
        wakeOptions: [
            "Don't wake me",
            "30 min before landing",
            "45 min before landing"
        ],
        defaults: {
            meal: "congee",
            mealTiming: "wake",
            dndAfterMeal: false,
            makeBed: false,
            wake: "30 min before landing",
            lighting: "Leave as cabin",
            crew: "Happy to chat",
            seat: "Window",
            quietZone: false,
            language: "English",
            subtitles: "繁體中文",
            interests: [
                "japanese-film",
                "animation",
                "travel-food",
                "k-drama"
            ]
        },
        continueWatching: [
            {
                itemId: "crash-landing",
                note: "Episode 7 · resumed from CX617 on 21 Jul",
                progress: 0.55
            }
        ],
        stats: {
            year: "2026",
            flights: 4,
            km: 8360,
            hours: 17,
            countries: 2,
            airports: 3,
            nightsOnBoard: 0,
            lifetimeMiles: 9150,
            topRoutes: [
                {
                    route: "HKG to KIX",
                    flights: 2
                },
                {
                    route: "HKG to BKK",
                    flights: 2
                }
            ],
            earthLaps: "0.2",
            favouriteSeat: "Window, left side",
            mostWatched: "Korean drama, 6 hours"
        },
        badgeProgress: {
            betsy: {
                value: 1,
                earnedOn: "6 Apr 2024",
                stats: [
                    "First Cathay flight: CX617 Hong Kong to Bangkok"
                ]
            },
            "new-stamp": {
                value: 3,
                earnedOn: "21 Jul 2026",
                thisYear: true,
                stats: [
                    "Japan, Thailand, Taiwan"
                ]
            },
            "set-once": {
                value: 0,
                note: "0 of 5 flights on a saved profile",
                left: "CX566 is your first flight with a profile.",
                stats: [
                    "Profile saved on 10 Oct 2026"
                ]
            },
            "night-shift": {
                value: 0,
                note: "0 of 5 red-eyes this quarter",
                left: "Five overnight flights in one quarter."
            },
            "home-hub": {
                value: 4,
                note: "4 of 100 departures from Hong Kong"
            },
            "full-innings": {
                value: 0,
                note: "0 of 6 hours of cricket this year"
            },
            "lights-out": {
                value: 0,
                note: "0 of 10 overnight flights in rest mode"
            },
            "route-regular": {
                value: 2,
                note: "2 of 10 flights on HKG to KIX",
                left: "Eight more Osaka flights for level I."
            },
            "around-the-world": {
                value: 0.21,
                note: "8,360 of 40,075 km this year"
            },
            "four-continents": {
                value: 1,
                note: "1 of 4 continents",
                left: "Asia so far."
            },
            "million-miler": {
                value: 0.006,
                note: "9,150 of 1,000,000 miles"
            },
            checkerboard: {
                value: 4,
                note: "4 of 500 landings in Hong Kong"
            },
            moonshot: {
                value: 0.02,
                note: "9,150 of 384,400 km lifetime"
            },
            "over-the-top": {
                value: 0,
                left: "Fly a polar route across the Arctic."
            },
            "jade-century": {
                value: 4,
                note: "4 of 100 flights in 2026"
            }
        },
        recap: {
            slept: "40m",
            watched: [
                {
                    title: "Spirited Away",
                    time: "2h 05m"
                },
                {
                    title: "Midnight Diner: Tokyo Stories, episode 1",
                    time: "24 min"
                }
            ],
            meal: "Congee at 09:35, woken as you asked",
            highlights: [
                "Subtitles in 繁體中文 from the first title",
                "Window seat 54K, left side for the view of Kansai Bay",
                "Three Japan titles queued before landing"
            ],
            yearHeadline: "Your first year with a flight profile",
            yearLines: [
                {
                    label: "Flights",
                    value: "5"
                },
                {
                    label: "Countries",
                    value: "2"
                },
                {
                    label: "Distance",
                    value: "10,840 km"
                },
                {
                    label: "Films finished on board",
                    value: "3"
                },
                {
                    label: "Status points to Silver",
                    value: "190"
                }
            ]
        }
    }
};
const METAL_LABEL = {
    jade: "Jade",
    bronze: "Bronze",
    silver: "Silver",
    gold: "Gold",
    diamond: "Diamond"
};
const METAL_BONUS = {
    jade: 10,
    bronze: 20,
    silver: 40,
    gold: 80,
    diamond: 150
};
const BADGES = [
    {
        id: "betsy",
        name: "Betsy",
        rule: "Fly your first Cathay flight",
        goal: 1,
        art: "betsy",
        metal: "jade",
        heldBy: "91%",
        story: "Named after Cathay's first aircraft, the 1946 DC-3 \"Betsy\"."
    },
    {
        id: "new-stamp",
        name: "New Stamp",
        rule: "Land in three different countries",
        goal: 3,
        art: "stamp",
        metal: "jade",
        heldBy: "54%",
        story: "Three passport stamps on Cathay flights."
    },
    {
        id: "set-once",
        name: "Set Once",
        rule: "Fly five flights on a saved flight profile",
        goal: 5,
        unit: "flights",
        art: "brushwing",
        metal: "jade",
        heldBy: "14%",
        story: "The brushwing, for flying the way you set it."
    },
    {
        id: "night-shift",
        name: "Night Shift",
        rule: "Fly five overnight flights in one quarter",
        goal: 5,
        unit: "red-eyes",
        art: "window-moon",
        metal: "bronze",
        heldBy: "9%",
        story: "The moon through the cabin window, somewhere over the Bay of Bengal."
    },
    {
        id: "home-hub",
        name: "Home Hub",
        rule: "Depart Hong Kong 100 times",
        goal: 100,
        unit: "departures",
        art: "skyline",
        metal: "bronze",
        heldBy: "6%",
        story: "The Hong Kong skyline from the harbour."
    },
    {
        id: "full-innings",
        name: "Full Innings",
        rule: "Watch six hours of cricket on board in a year",
        goal: 6,
        unit: "hours",
        art: "cricket",
        metal: "bronze",
        heldBy: "3%",
        story: "Bat, ball and stumps, watched from 38,000 feet."
    },
    {
        id: "lights-out",
        name: "Lights Out",
        rule: "Use rest mode on 10 overnight flights",
        goal: 10,
        unit: "flights",
        art: "lie-flat",
        metal: "bronze",
        heldBy: "4%",
        story: "A made-up bed in the Business Class suite."
    },
    {
        id: "route-regular",
        name: "Route Regular",
        rule: "Fly one route 10, 50 and 200 times",
        goal: 10,
        unit: "flights",
        art: "route",
        metal: "silver",
        heldBy: "12%",
        story: "Your most-flown route, drawn as the great-circle arc."
    },
    {
        id: "around-the-world",
        name: "Around the World",
        rule: "Fly 40,075 km in one calendar year",
        goal: 1,
        art: "a350",
        metal: "silver",
        heldBy: "8%",
        story: "The A350-900, Cathay's long-haul workhorse."
    },
    {
        id: "four-continents",
        name: "Four Continents",
        rule: "Land on four continents",
        goal: 4,
        unit: "continents",
        art: "globe",
        metal: "silver",
        heldBy: "7%",
        story: "Four continents on one network."
    },
    {
        id: "million-miler",
        name: "Million Miler",
        rule: "Fly 1,000,000 miles with Cathay",
        goal: 1,
        art: "b747",
        metal: "gold",
        heldBy: "0.3%",
        story: "The 747, Queen of the Skies, flown by Cathay from 1979 to 2016."
    },
    {
        id: "checkerboard",
        name: "Checkerboard",
        rule: "Land in Hong Kong 500 times",
        goal: 500,
        unit: "landings",
        art: "checkerboard",
        metal: "gold",
        heldBy: "0.2%",
        story: "The orange-and-white checkerboard on the hill that guided the turn into Kai Tak until 1998."
    },
    {
        id: "moonshot",
        name: "Moonshot",
        rule: "Fly 384,400 km, the distance to the Moon",
        goal: 1,
        art: "moonshot",
        metal: "gold",
        heldBy: "1.9%",
        story: "Earth to Moon, one flight at a time."
    },
    {
        id: "over-the-top",
        name: "Over the Top",
        rule: "Fly a polar route across the Arctic",
        goal: 1,
        art: "polar",
        metal: "diamond",
        heldBy: "0.02%",
        story: "True north, on the great-circle route over the pole."
    },
    {
        id: "jade-century",
        name: "Jade Century",
        rule: "Fly 100 Cathay flights in one calendar year",
        goal: 100,
        unit: "flights",
        art: "hundred",
        metal: "diamond",
        heldBy: "0.0001%",
        story: "One hundred flights in a single year."
    }
];
const TIERS = [
    {
        name: "Green",
        points: 0,
        pointsLabel: "On joining",
        benefits: [
            "Earn Asia Miles and status points on every flight",
            "Redeem flights and upgrades with Asia Miles",
            "Member offers and fares"
        ],
        pinPerks: [
            "Pins add bonus status points"
        ]
    },
    {
        name: "Silver",
        points: 300,
        pointsLabel: "300 status points",
        benefits: [
            "Business Class check-in",
            "Extra baggage allowance",
            "Priority waitlist and standby"
        ],
        pinPerks: [
            "Priority meal choice on flights over four hours"
        ]
    },
    {
        name: "Gold",
        points: 600,
        pointsLabel: "600 status points",
        benefits: [
            "Business Class lounge access, plus one guest",
            "Priority boarding",
            "Priority baggage",
            "Extra baggage allowance"
        ],
        pinPerks: [
            "Two extra lounge guest passes a year"
        ]
    },
    {
        name: "Diamond",
        points: 1200,
        pointsLabel: "1,200 status points",
        benefits: [
            "First Class lounge access, plus one guest",
            "First Class check-in",
            "Guaranteed Economy seat on full flights",
            "Extra baggage allowance"
        ],
        pinPerks: [
            "Priority meal choice on every flight",
            "Cricket screening invites at The Pier lounge"
        ]
    },
    {
        name: "Diamond Exec",
        points: 2400,
        pointsLabel: "By invitation, about 2,400 status points",
        invitation: true,
        benefits: [
            "Everything in Diamond",
            "Upgrade vouchers every membership year",
            "Dedicated Diamond Exec service team"
        ],
        pinPerks: [
            "Four upgrade vouchers on joining",
            "25,000 bonus Asia Miles"
        ]
    }
];
function tierIndex(name) {
    return TIERS.findIndex((t)=>t.name === name);
}
const CATALOG = [
    {
        id: "ct-2025",
        title: "ICC Champions Trophy 2025 Final",
        kind: "Cricket",
        meta: "India v New Zealand · Dubai · Full replay",
        img: "/media/dubai-stadium.jpg",
        tags: [
            "cricket"
        ]
    },
    {
        id: "t20-2024",
        title: "T20 World Cup 2024 Final",
        kind: "Cricket",
        meta: "India v South Africa · Bridgetown · Highlights",
        img: "/media/kensington.jpg",
        tags: [
            "cricket"
        ]
    },
    {
        id: "wc-2011",
        title: "Cricket World Cup 2011 Final",
        kind: "Cricket",
        meta: "India v Sri Lanka · Mumbai · Classic match",
        img: "/media/wankhede.jpg",
        tags: [
            "cricket"
        ]
    },
    {
        id: "ipl-2025",
        title: "IPL 2025 Final",
        kind: "Cricket",
        meta: "Royal Challengers Bengaluru v Punjab Kings · Ahmedabad",
        img: "/media/modi-stadium.jpg",
        tags: [
            "cricket"
        ]
    },
    {
        id: "lords-2021",
        title: "England v India, Lord's 2021",
        kind: "Cricket",
        meta: "Second Test, day five · Highlights",
        img: "/media/lords.jpg",
        tags: [
            "cricket"
        ]
    },
    {
        id: "film-83",
        title: "83",
        kind: "Film",
        meta: "2021 · 2h 42m · Hindi",
        img: "/media/film-83.jpg",
        tags: [
            "cricket",
            "indian-cinema"
        ]
    },
    {
        id: "lagaan",
        title: "Lagaan",
        kind: "Film",
        meta: "2001 · 3h 44m · Hindi",
        img: "/media/lagaan.jpg",
        tags: [
            "cricket",
            "indian-cinema"
        ]
    },
    {
        id: "dhoni",
        title: "M.S. Dhoni: The Untold Story",
        kind: "Film",
        meta: "2016 · 3h 10m · Hindi",
        img: "/media/dhoni.jpg",
        tags: [
            "cricket",
            "indian-cinema"
        ]
    },
    {
        id: "kai-po-che",
        title: "Kai Po Che!",
        kind: "Film",
        meta: "2013 · 2h 10m · Hindi",
        img: "/media/kai-po-che.jpg",
        tags: [
            "indian-cinema"
        ]
    },
    {
        id: "12th-fail",
        title: "12th Fail",
        kind: "Film",
        meta: "2023 · 2h 27m · Hindi",
        img: "/media/12th-fail.jpg",
        tags: [
            "indian-cinema"
        ]
    },
    {
        id: "lunchbox",
        title: "The Lunchbox",
        kind: "Film",
        meta: "2013 · 1h 44m · Hindi, English",
        img: "/media/lunchbox.jpg",
        tags: [
            "indian-cinema"
        ]
    },
    {
        id: "scam-1992",
        title: "Scam 1992",
        kind: "TV",
        meta: "Series · 10 episodes · Hindi",
        img: "/media/scam-1992.png",
        tags: [
            "indian-cinema",
            "drama",
            "business-news"
        ]
    },
    {
        id: "lion",
        title: "Lion",
        kind: "Film",
        meta: "2016 · 1h 58m · English, Hindi",
        img: "/media/lion.png",
        tags: [
            "indian-cinema",
            "new-films"
        ]
    },
    {
        id: "oppenheimer",
        title: "Oppenheimer",
        kind: "Film",
        meta: "2023 · 3h 00m · English",
        img: "/media/oppenheimer.jpg",
        tags: [
            "new-films"
        ]
    },
    {
        id: "conclave",
        title: "Conclave",
        kind: "Film",
        meta: "2024 · 2h 00m · English",
        img: "/media/conclave.jpg",
        tags: [
            "new-films",
            "drama"
        ]
    },
    {
        id: "the-crown",
        title: "The Crown",
        kind: "TV",
        meta: "Series · Season 6 · English",
        img: "/media/the-crown.jpg",
        tags: [
            "drama"
        ]
    },
    {
        id: "succession",
        title: "Succession",
        kind: "TV",
        meta: "Series · Season 4 · English",
        tags: [
            "drama",
            "business-news"
        ]
    },
    {
        id: "wicked",
        title: "Wicked",
        kind: "Film",
        meta: "2024 · 2h 40m · English",
        img: "/media/wicked.png",
        tags: [
            "new-films"
        ]
    },
    {
        id: "inside-out-2",
        title: "Inside Out 2",
        kind: "Film",
        meta: "2024 · 1h 36m · English, Cantonese",
        img: "/media/inside-out-2.jpg",
        tags: [
            "animation",
            "new-films"
        ]
    },
    {
        id: "past-lives",
        title: "Past Lives",
        kind: "Film",
        meta: "2023 · 1h 46m · English, Korean",
        img: "/media/past-lives.png",
        tags: [
            "new-films",
            "k-drama"
        ]
    },
    {
        id: "spirited-away",
        title: "Spirited Away",
        kind: "Film",
        meta: "2001 · 2h 05m · Japanese",
        img: "/media/spirited-away.png",
        tags: [
            "japanese-film",
            "animation"
        ]
    },
    {
        id: "your-name",
        title: "Your Name",
        kind: "Film",
        meta: "2016 · 1h 46m · Japanese",
        img: "/media/your-name.png",
        tags: [
            "japanese-film",
            "animation"
        ]
    },
    {
        id: "boy-and-heron",
        title: "The Boy and the Heron",
        kind: "Film",
        meta: "2023 · 2h 04m · Japanese",
        img: "/media/boy-and-heron.jpg",
        tags: [
            "japanese-film",
            "animation"
        ]
    },
    {
        id: "shoplifters",
        title: "Shoplifters",
        kind: "Film",
        meta: "2018 · 2h 01m · Japanese",
        img: "/media/shoplifters.jpg",
        tags: [
            "japanese-film"
        ]
    },
    {
        id: "drive-my-car",
        title: "Drive My Car",
        kind: "Film",
        meta: "2021 · 2h 59m · Japanese",
        img: "/media/drive-my-car.jpg",
        tags: [
            "japanese-film"
        ]
    },
    {
        id: "godzilla-minus-one",
        title: "Godzilla Minus One",
        kind: "Film",
        meta: "2023 · 2h 05m · Japanese",
        img: "/media/godzilla-minus-one.jpg",
        tags: [
            "japanese-film",
            "new-films"
        ]
    },
    {
        id: "perfect-days",
        title: "Perfect Days",
        kind: "Film",
        meta: "2023 · 2h 04m · Japanese",
        tags: [
            "japanese-film"
        ]
    },
    {
        id: "midnight-diner",
        title: "Midnight Diner: Tokyo Stories",
        kind: "TV",
        meta: "Series · Japanese",
        img: "/media/midnight-diner.jpg",
        tags: [
            "japanese-film",
            "travel-food"
        ]
    },
    {
        id: "phil",
        title: "Somebody Feed Phil",
        kind: "TV",
        meta: "Series · Season 7 · English",
        img: "/media/phil.jpg",
        tags: [
            "travel-food"
        ]
    },
    {
        id: "crash-landing",
        title: "Crash Landing on You",
        kind: "TV",
        meta: "Series · 16 episodes · Korean",
        img: "/media/crash-landing.png",
        tags: [
            "k-drama"
        ]
    },
    {
        id: "abr",
        title: "Asia Business Report",
        kind: "News",
        meta: "BBC · Today's edition",
        tags: [
            "business-news",
            "world-news"
        ]
    },
    {
        id: "squawk",
        title: "Squawk Box Asia",
        kind: "News",
        meta: "CNBC · Today's edition",
        tags: [
            "business-news"
        ]
    },
    {
        id: "bbc-world",
        title: "BBC World News",
        kind: "News",
        meta: "BBC · Hourly bulletin",
        tags: [
            "world-news"
        ]
    },
    {
        id: "india-brief",
        title: "Market Wrap: India",
        kind: "News",
        meta: "ET Now · Today's close",
        tags: [
            "business-news"
        ]
    }
];
const ROW_TITLES = {
    cricket: "Cricket, live and recorded",
    "world-news": "World news",
    "business-news": "Markets and business",
    "indian-cinema": "Indian cinema",
    drama: "Drama series",
    "new-films": "New films",
    "japanese-film": "Before you land in Japan",
    animation: "Animation",
    "travel-food": "Travel and food",
    "k-drama": "Korean drama"
};
const NEWS_SECTIONS = [
    {
        title: "Markets",
        tag: "business-news",
        lines: [
            "Hang Seng and Sensex close summary, with the day's biggest movers",
            "Rupee and Hong Kong dollar rates at departure time",
            "Cotton and yarn prices, weekly change"
        ]
    },
    {
        title: "India",
        tag: "world-news",
        lines: [
            "Delhi weather on arrival and air quality forecast",
            "Morning front pages from The Economic Times and Hindustan Times"
        ]
    },
    {
        title: "Hong Kong",
        tag: "always",
        lines: [
            "South China Morning Post evening edition, top five stories"
        ]
    },
    {
        title: "Osaka",
        tag: "travel-food",
        lines: [
            "Osaka weather on arrival and for the week ahead",
            "Kansai Airport rail and bus service updates"
        ]
    },
    {
        title: "Cricket",
        tag: "cricket",
        lines: [
            "Scores and reports from the day's international matches",
            "Team news and the week's fixtures"
        ]
    }
];
const RETURN_TRIP = {
    flight: "CX694",
    date: "Sun 18 Oct",
    fromCity: "Delhi",
    toCity: "Hong Kong",
    seat: "11A"
};
const SHOP_ITEMS = [
    {
        id: "milk-tea",
        name: "Hong Kong milk tea set",
        why: "The tea you were woken with before Delhi",
        detail: "The on-board blend, evaporated milk and two cha chaan teng glasses.",
        hkd: 228,
        img: "/media/shop/milk-tea.jpg"
    },
    {
        id: "cathay-delight",
        name: "Cathay Delight kit",
        why: "Served after take-off on CX695",
        detail: "Kiwi, coconut and mint syrup for the signature drink. Makes 12 glasses.",
        hkd: 168,
        img: "/media/shop/cathay-delight.jpg"
    },
    {
        id: "dc3-model",
        name: "DC-3 model, 1:100",
        why: "Cathay's first aircraft, as on your Betsy pin",
        detail: "Die-cast, in the 1946 livery, with a display stand.",
        hkd: 680,
        img: "/media/shop/betsy-model.jpg"
    }
];
function itemById(id) {
    return CATALOG.find((i)=>i.id === id);
}
function tierColour(tier) {
    switch(tier){
        case "Diamond Exec":
            return {
                bg: "#1b1d21",
                fg: "#ffffff",
                accent: "#d9dde2"
            };
        case "Diamond":
            return {
                bg: "#2b2d31",
                fg: "#ffffff",
                accent: "#c9ccd1"
            };
        case "Gold":
            return {
                bg: "#b3914a",
                fg: "#ffffff",
                accent: "#efe1bd"
            };
        case "Silver":
            return {
                bg: "#8d969c",
                fg: "#ffffff",
                accent: "#e3e6e8"
            };
        default:
            return {
                bg: "#0f6e66",
                fg: "#ffffff",
                accent: "#bfe0d6"
            };
    }
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/plan.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "ELAPSED_MIN",
    ()=>ELAPSED_MIN,
    "onboardPlan",
    ()=>onboardPlan,
    "remaining",
    ()=>remaining,
    "summaryRows",
    ()=>summaryRows
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$armchair$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Armchair$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/armchair.mjs [app-client] (ecmascript) <export default as Armchair>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/moon.mjs [app-client] (ecmascript) <export default as Moon>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tv$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tv$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/tv.mjs [app-client] (ecmascript) <export default as Tv>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$utensils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Utensils$3e$__ = __turbopack_context__.i("[project]/node_modules/lucide-react/dist/esm/icons/utensils.mjs [app-client] (ecmascript) <export default as Utensils>");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/data.ts [app-client] (ecmascript)");
;
;
function summaryRows(profileId, prefs, mealName) {
    const p = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][profileId];
    const meal = p.meals.find((m)=>m.id === prefs.meal);
    const timing = p.mealTimings.find((m)=>m.id === prefs.mealTiming);
    const dish = mealName ?? meal?.name;
    const interests = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["INTERESTS"].filter((i)=>prefs.interests.includes(i.id)).map((i)=>i.label);
    return [
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$utensils$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Utensils$3e$__["Utensils"],
            label: "Meal",
            value: dish ? `${dish}${timing ? `, ${timing.label.toLowerCase()}` : ""}` : "Not chosen yet",
            step: 0
        },
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$moon$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Moon$3e$__["Moon"],
            label: "Rest",
            value: [
                prefs.dndAfterMeal ? "Do not disturb after the meal" : "Crew check in as normal",
                prefs.makeBed && p.trip.cabin === "Business" ? "bed made up" : null,
                prefs.wake === "Don't wake me" ? "no wake-up" : `wake ${prefs.wake}`
            ].filter(Boolean).join(", "),
            step: 1
        },
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$armchair$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Armchair$3e$__["Armchair"],
            label: "Seat",
            value: `${prefs.seat}${prefs.quietZone ? ", quiet zone" : ""}`,
            step: 2
        },
        {
            icon: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$lucide$2d$react$2f$dist$2f$esm$2f$icons$2f$tv$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__$3c$export__default__as__Tv$3e$__["Tv"],
            label: "Screen",
            value: `${prefs.language}, subtitles ${prefs.subtitles.toLowerCase() === "off" ? "off" : prefs.subtitles}. ${interests.join(", ")} first`,
            step: 3
        }
    ];
}
function onboardPlan(profileId, prefs) {
    const p = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][profileId];
    const meal = p.meals.find((m)=>m.id === prefs.meal)?.name;
    if (profileId === "anil") {
        return [
            {
                at: "Boarding · 19:25",
                label: "Seat screen opens on cricket and news, English, no subtitles"
            },
            {
                at: prefs.mealTiming === "early" ? "After take-off · about 20:40" : "When you ask",
                label: `${meal} served${prefs.mealTiming === "early" ? " first in the cabin" : ""}`
            },
            {
                at: "After dinner",
                label: [
                    prefs.makeBed ? "Bed made up" : null,
                    prefs.lighting === "Dim and warm" ? "lights dimmed" : null,
                    prefs.dndAfterMeal ? "do not disturb on" : null
                ].filter(Boolean).join(", ") || "Normal service"
            },
            {
                at: prefs.wake === "Don't wake me" ? "Before landing" : prefs.wake.replace(" min", " minutes"),
                label: prefs.wake === "Don't wake me" ? "Crew leave you to rest" : "Woken with tea and a hot towel"
            }
        ];
    }
    return [
        {
            at: "Boarding · 08:10",
            label: `Seat screen opens on Japan picks, ${prefs.subtitles === "Off" ? "no subtitles" : `subtitles in ${prefs.subtitles}`}`
        },
        {
            at: "About 09:35",
            label: `${meal}${prefs.mealTiming === "wake" ? ", crew wake you for it" : ""}`
        },
        {
            at: prefs.wake === "Don't wake me" ? "Before landing" : prefs.wake.replace(" min", " minutes"),
            label: "Arrival card and Osaka transport tips on screen"
        }
    ];
}
const ELAPSED_MIN = {
    anil: 60,
    chloe: 60
};
function remaining(profileId) {
    const left = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][profileId].trip.durationMin - ELAPSED_MIN[profileId];
    return `${Math.floor(left / 60)}h ${String(left % 60).padStart(2, "0")}m`;
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/store.tsx [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "DemoProvider",
    ()=>DemoProvider,
    "SWITCH_FLIP_MS",
    ()=>SWITCH_FLIP_MS,
    "SWITCH_MS",
    ()=>SWITCH_MS,
    "badgeState",
    ()=>badgeState,
    "statusSummary",
    ()=>statusSummary,
    "useDemo",
    ()=>useDemo,
    "useProfile",
    ()=>useProfile
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/jsx-dev-runtime.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/compiled/react/index.js [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/lib/data.ts [app-client] (ecmascript)");
;
var _s = __turbopack_context__.k.signature(), _s1 = __turbopack_context__.k.signature(), _s2 = __turbopack_context__.k.signature();
"use client";
;
;
const SWITCH_FLIP_MS = 1500;
const SWITCH_MS = 3000;
const KEY = "cx-flight-profile-demo-v3";
/** Entering the TV view from anywhere else plays the seat push-in, unless skipped. */ function withZoom(prev, next) {
    const entering = next.view === "tv" && (!prev || prev.view !== "tv");
    return {
        ...next,
        zoomAt: entering && !next.skipZoom ? Date.now() : prev && next.view === "tv" ? next.zoomAt : 0
    };
}
function initial() {
    return {
        profileId: "anil",
        view: "phone",
        phone: "home",
        setupStep: 0,
        tv: "idle",
        badgeId: "night-shift",
        badgeFrom: "pins",
        prefs: {
            anil: structuredClone(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"].anil.defaults),
            chloe: structuredClone(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"].chloe.defaults)
        },
        saved: {
            anil: false,
            chloe: true
        },
        flown: {
            anil: false,
            chloe: false
        },
        slide: 0,
        pipeStep: 1,
        idea: 0,
        skipZoom: false,
        flatZoom: false,
        zoomAt: 0,
        switching: null
    };
}
const DemoContext = /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["createContext"])(null);
function DemoProvider({ children }) {
    _s();
    const [state, setState] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(initial);
    const [bare, setBare] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    const [ready, setReady] = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useState"])(false);
    /* eslint-disable react-hooks/set-state-in-effect -- state is restored from localStorage and the URL after mount */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DemoProvider.useEffect": ()=>{
            let next = initial();
            try {
                const raw = localStorage.getItem(KEY);
                if (raw) next = {
                    ...next,
                    ...JSON.parse(raw)
                };
            } catch  {}
            const q = new URLSearchParams(window.location.search);
            if (q.has("fresh")) next = initial();
            const profile = q.get("profile");
            if (profile === "anil" || profile === "chloe") next.profileId = profile;
            const view = q.get("view");
            if (view === "phone" || view === "tv" || view === "cathay" || view === "pitch" || view === "crew") next.view = view;
            const slide = q.get("slide");
            if (slide) next.slide = Number(slide);
            const pstep = q.get("pstep");
            if (pstep) next.pipeStep = Number(pstep);
            const phone = q.get("phone");
            if (phone) next.phone = phone;
            const step = q.get("step");
            if (step) next.setupStep = Number(step);
            const tv = q.get("tv");
            if (tv) next.tv = tv;
            const badge = q.get("badge");
            if (badge) next.badgeId = badge;
            if (q.get("saved") === "1") next.saved = {
                anil: true,
                chloe: true
            };
            if (q.get("saved") === "0") next.saved = {
                anil: false,
                chloe: false
            };
            if (q.get("flown") === "1") next.flown = {
                anil: true,
                chloe: true
            };
            if (q.get("zoom") === "0") next.skipZoom = true;
            if (q.get("zoom") === "1" || q.get("zoom") === "flat") next.skipZoom = false;
            if (q.has("zoom")) next.flatZoom = q.get("zoom") === "flat";
            if (q.get("idea") === "2") next.idea = 2;
            if (q.get("idea") === "3") next.idea = 3;
            if (q.get("bare") === "1") setBare(true);
            if (q.get("blank") === "1") next.prefs.anil = {
                ...next.prefs.anil,
                meal: "",
                mealTiming: "",
                dndAfterMeal: false,
                makeBed: false,
                wake: "Don't wake me"
            };
            next.switching = null;
            setState(withZoom(null, next));
            setReady(true);
        }
    }["DemoProvider.useEffect"], []);
    /* eslint-enable react-hooks/set-state-in-effect */ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DemoProvider.useEffect": ()=>{
            if (ready) localStorage.setItem(KEY, JSON.stringify(state));
        }
    }["DemoProvider.useEffect"], [
        state,
        ready
    ]);
    const switchProfile = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "DemoProvider.useCallback[switchProfile]": (to, tv = "welcome")=>{
            setState({
                "DemoProvider.useCallback[switchProfile]": (s)=>{
                    const target = to ?? (s.profileId === "anil" ? "chloe" : "anil");
                    if (target === s.profileId || s.switching) return s;
                    if (s.view !== "tv" || s.zoomAt) return {
                        ...s,
                        profileId: target
                    };
                    const at = Date.now();
                    setTimeout({
                        "DemoProvider.useCallback[switchProfile]": ()=>setState({
                                "DemoProvider.useCallback[switchProfile]": (x)=>x.switching?.at === at ? {
                                        ...x,
                                        profileId: target,
                                        tv
                                    } : x
                            }["DemoProvider.useCallback[switchProfile]"])
                    }["DemoProvider.useCallback[switchProfile]"], SWITCH_FLIP_MS);
                    setTimeout({
                        "DemoProvider.useCallback[switchProfile]": ()=>setState({
                                "DemoProvider.useCallback[switchProfile]": (x)=>x.switching?.at === at ? {
                                        ...x,
                                        switching: null
                                    } : x
                            }["DemoProvider.useCallback[switchProfile]"])
                    }["DemoProvider.useCallback[switchProfile]"], SWITCH_MS);
                    return {
                        ...s,
                        switching: {
                            from: s.profileId,
                            to: target,
                            at
                        }
                    };
                }
            }["DemoProvider.useCallback[switchProfile]"]);
        }
    }["DemoProvider.useCallback[switchProfile]"], []);
    (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useEffect"])({
        "DemoProvider.useEffect": ()=>{
            const onKey = {
                "DemoProvider.useEffect.onKey": (e)=>{
                    if (e.target?.tagName === "INPUT") return;
                    if (e.key === "1") setState({
                        "DemoProvider.useEffect.onKey": (s)=>withZoom(s, {
                                ...s,
                                view: "phone"
                            })
                    }["DemoProvider.useEffect.onKey"]);
                    if (e.key === "2") setState({
                        "DemoProvider.useEffect.onKey": (s)=>withZoom(s, {
                                ...s,
                                view: "tv"
                            })
                    }["DemoProvider.useEffect.onKey"]);
                    if (e.key === "3") setState({
                        "DemoProvider.useEffect.onKey": (s)=>withZoom(s, {
                                ...s,
                                view: "cathay"
                            })
                    }["DemoProvider.useEffect.onKey"]);
                    if (e.key === "4") setState({
                        "DemoProvider.useEffect.onKey": (s)=>withZoom(s, {
                                ...s,
                                view: "pitch"
                            })
                    }["DemoProvider.useEffect.onKey"]);
                    if (e.key === "p") switchProfile();
                    if (e.key === "P") switchProfile(undefined, "home");
                    if (e.key === "h") setBare({
                        "DemoProvider.useEffect.onKey": (b)=>!b
                    }["DemoProvider.useEffect.onKey"]);
                }
            }["DemoProvider.useEffect.onKey"];
            window.addEventListener("keydown", onKey);
            return ({
                "DemoProvider.useEffect": ()=>window.removeEventListener("keydown", onKey)
            })["DemoProvider.useEffect"];
        }
    }["DemoProvider.useEffect"], [
        switchProfile
    ]);
    const set = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "DemoProvider.useCallback[set]": (patch)=>setState({
                "DemoProvider.useCallback[set]": (s)=>withZoom(s, {
                        ...s,
                        ...patch
                    })
            }["DemoProvider.useCallback[set]"])
    }["DemoProvider.useCallback[set]"], []);
    const setPrefs = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "DemoProvider.useCallback[setPrefs]": (patch)=>setState({
                "DemoProvider.useCallback[setPrefs]": (s)=>({
                        ...s,
                        prefs: {
                            ...s.prefs,
                            [s.profileId]: {
                                ...s.prefs[s.profileId],
                                ...patch
                            }
                        }
                    })
            }["DemoProvider.useCallback[setPrefs]"])
    }["DemoProvider.useCallback[setPrefs]"], []);
    const reset = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useCallback"])({
        "DemoProvider.useCallback[reset]": ()=>{
            localStorage.removeItem(KEY);
            setState(initial());
        }
    }["DemoProvider.useCallback[reset]"], []);
    const value = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useMemo"])({
        "DemoProvider.useMemo[value]": ()=>({
                ...state,
                bare,
                ready,
                set,
                setPrefs,
                switchProfile,
                reset
            })
    }["DemoProvider.useMemo[value]"], [
        state,
        bare,
        ready,
        set,
        setPrefs,
        switchProfile,
        reset
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["jsxDEV"])(DemoContext.Provider, {
        value: value,
        children: children
    }, void 0, false, {
        fileName: "[project]/src/lib/store.tsx",
        lineNumber: 167,
        columnNumber: 10
    }, this);
}
_s(DemoProvider, "OeMR8c9GLMP5ouuNE9W5aNxLT1w=");
_c = DemoProvider;
function useDemo() {
    _s1();
    const ctx = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$compiled$2f$react$2f$index$2e$js__$5b$app$2d$client$5d$__$28$ecmascript$29$__["useContext"])(DemoContext);
    if (!ctx) throw new Error("useDemo outside DemoProvider");
    return ctx;
}
_s1(useDemo, "/dMy7t63NXD4eYACoT93CePwGrg=");
function useProfile() {
    _s2();
    const d = useDemo();
    return {
        ...d,
        profile: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][d.profileId],
        prefs: d.prefs[d.profileId],
        isSaved: d.saved[d.profileId],
        hasFlown: d.flown[d.profileId]
    };
}
_s2(useProfile, "4nLWtMfwubZQjefEieDxj0xukIw=", false, function() {
    return [
        useDemo
    ];
});
function badgeState(profileId, badgeId, saved, flown, prefs) {
    const badge = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BADGES"].find((b)=>b.id === badgeId);
    const p = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][profileId].badgeProgress[badgeId] ?? {
        value: 0
    };
    let value = p.value;
    if (flown && saved && badgeId === "set-once") value += 1;
    if (flown && prefs.dndAfterMeal && badgeId === "lights-out" && profileId === "anil") value += 1;
    if (flown && badgeId === "night-shift" && profileId === "anil") value += 1;
    const before = p.value >= badge.goal;
    const earned = value >= badge.goal;
    const progress = Math.min(1, value / badge.goal);
    const label = badge.goal === 1 ? earned ? "Earned" : progress < 0.01 ? "Not yet" : `${Math.round(progress * 1000) / 10}% of the way` : `${Math.min(value, badge.goal)} of ${badge.goal}${badge.unit ? ` ${badge.unit}` : ""}`;
    return {
        earned,
        progress,
        label,
        earnedOn: earned ? p.earnedOn ?? `On ${__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][profileId].trip.flight}` : undefined,
        level: p.level,
        justEarned: earned && !before,
        value,
        thisYear: !!p.thisYear || earned && !before,
        note: earned && !before ? undefined : p.note,
        left: p.left,
        stats: p.stats ?? []
    };
}
function statusSummary(profileId, saved, flown, prefs) {
    const profile = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["PROFILES"][profileId];
    const pins = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["BADGES"].map((b)=>({
            b,
            st: badgeState(profileId, b.id, saved, flown, prefs)
        }));
    const pinPoints = pins.filter((x)=>x.st.earned && x.st.thisYear).reduce((n, x)=>n + __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["METAL_BONUS"][x.b.metal], 0);
    const total = profile.flightPoints + pinPoints;
    const start = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"].findIndex((t)=>t.name === profile.tier);
    let idx = start;
    while(idx + 1 < __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"].length && total >= __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"][idx + 1].points)idx++;
    const current = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"][idx];
    /** At the top tier the bar stays pinned to it, so `next` is the current tier. */ const next = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"][Math.min(idx + 1, __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"].length - 1)];
    const promoted = idx > start;
    return {
        pins,
        earnedCount: pins.filter((x)=>x.st.earned).length,
        flightPoints: profile.flightPoints,
        pinPoints,
        total,
        tier: current.name,
        previous: __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"][start],
        promoted,
        top: idx === __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$lib$2f$data$2e$ts__$5b$app$2d$client$5d$__$28$ecmascript$29$__["TIERS"].length - 1,
        current,
        next,
        toNext: Math.max(0, next.points - total),
        progress: next === current ? 1 : Math.min(1, (total - current.points) / (next.points - current.points))
    };
}
var _c;
__turbopack_context__.k.register(_c, "DemoProvider");
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
"[project]/src/lib/utils.ts [app-client] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "cn",
    ()=>cn
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/clsx/dist/clsx.mjs [app-client] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/tailwind-merge/dist/bundle-mjs.mjs [app-client] (ecmascript)");
;
;
function cn(...inputs) {
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$tailwind$2d$merge$2f$dist$2f$bundle$2d$mjs$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["twMerge"])((0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$clsx$2f$dist$2f$clsx$2e$mjs__$5b$app$2d$client$5d$__$28$ecmascript$29$__["clsx"])(inputs));
}
if (typeof globalThis.$RefreshHelpers$ === 'object' && globalThis.$RefreshHelpers !== null) {
    __turbopack_context__.k.registerExports(__turbopack_context__.m, globalThis.$RefreshHelpers$);
}
}),
]);})()

//# sourceMappingURL=src_lib_1mk8_csonovq0._.js.map