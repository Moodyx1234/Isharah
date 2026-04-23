export interface TranscriptChunk {
  text: string;
  textEn: string;
  delayMs: number;
}

export const sampleTranscriptAr: TranscriptChunk[] = [
  { text: "السلام عليكم ورحمة الله وبركاته", textEn: "Peace be upon you and God's mercy and blessings", delayMs: 0 },
  { text: "أهلاً وسهلاً بكم جميعاً في محاضرة اليوم", textEn: "Welcome everyone to today's lecture", delayMs: 2500 },
  { text: "سنتحدث اليوم عن الخوارزميات وأهميتها في علوم الحاسب", textEn: "Today we will talk about algorithms and their importance in computer science", delayMs: 5000 },
  { text: "الخوارزمية هي مجموعة من التعليمات المنطقية المرتبة لحل مشكلة معينة", textEn: "An algorithm is a set of ordered logical instructions to solve a specific problem", delayMs: 9000 },
  { text: "دعونا نتعرف على أنواع الخوارزميات الأساسية", textEn: "Let us learn about the basic types of algorithms", delayMs: 13000 },
  { text: "النوع الأول هو خوارزميات الفرز، مثل الفرز الفقاعي والفرز السريع", textEn: "The first type is sorting algorithms, such as bubble sort and quick sort", delayMs: 16000 },
  { text: "خوارزمية الفرز الفقاعي تقارن كل عنصرين متجاورين وتبادل مواضعهما إذا كانا في ترتيب خاطئ", textEn: "Bubble sort compares adjacent elements and swaps them if they are in the wrong order", delayMs: 21000 },
  { text: "النوع الثاني هو خوارزميات البحث، مثل البحث الخطي والبحث الثنائي", textEn: "The second type is search algorithms, such as linear search and binary search", delayMs: 27000 },
  { text: "البحث الثنائي أسرع بكثير من البحث الخطي لأنه يقسم البيانات إلى نصفين في كل خطوة", textEn: "Binary search is much faster than linear search as it halves the data at each step", delayMs: 32000 },
  { text: "الآن، هل لديكم أي أسئلة حول ما تم شرحه؟", textEn: "Now, do you have any questions about what was explained?", delayMs: 38000 },
  { text: "في الشريحة التالية سنرى مثالاً عملياً على الفرز الفقاعي", textEn: "In the next slide we will see a practical example of bubble sort", delayMs: 42000 },
  { text: "لاحظوا كيف تتحرك القيم الأكبر نحو نهاية القائمة في كل دورة", textEn: "Notice how larger values move toward the end of the list each cycle", delayMs: 47000 },
  { text: "شكراً لانتباهكم، سنلتقي في المحاضرة القادمة", textEn: "Thank you for your attention, we will meet in the next lecture", delayMs: 52000 },
];

export const sampleSlideDescriptions = {
  ar: [
    "الشريحة تحتوي على رسم بياني يوضح مقارنة بين خوارزميات الفرز المختلفة من حيث التعقيد الزمني. يظهر في المحور الأفقي حجم البيانات ن، وفي المحور العمودي الوقت المستغرق. خوارزمية الفرز السريع تظهر الأداء الأفضل مع البيانات الكبيرة.",
    "الشريحة تعرض كود Python لخوارزمية الفرز الفقاعي. تتضمن دالة bubble_sort مع حلقتين متداخلتين وعملية المقارنة والتبادل. الكود مكتوب بخط واضح مع تعليقات باللغة العربية.",
    "الشريحة تحتوي على جدول يقارن بين الخوارزميات الأربعة الرئيسية: الفرز الفقاعي O(n²)، الفرز بالإدراج O(n²)، الفرز بالدمج O(n log n)، والفرز السريع O(n log n) في المتوسط.",
  ],
  en: [
    "The slide contains a chart comparing different sorting algorithms in terms of time complexity. The horizontal axis shows data size n, and the vertical axis shows time taken. Quick sort shows the best performance with large data.",
    "The slide shows Python code for the bubble sort algorithm. It includes a bubble_sort function with two nested loops and a comparison and swap operation. The code is written clearly with Arabic comments.",
    "The slide contains a table comparing four main algorithms: Bubble Sort O(n²), Insertion Sort O(n²), Merge Sort O(n log n), and Quick Sort O(n log n) on average.",
  ],
};

export const sampleReviewQuestions = {
  ar: [
    { q: "ما هو التعقيد الزمني لخوارزمية الفرز الفقاعي في أسوأ الحالات؟", a: "O(n²) حيث n هو حجم البيانات" },
    { q: "ما الفرق الرئيسي بين البحث الخطي والبحث الثنائي؟", a: "البحث الثنائي يعمل فقط على قوائم مرتبة ويقسمها إلى نصفين، أما البحث الخطي فيفحص كل عنصر على التوالي" },
    { q: "في أي حالة يكون الفرز السريع أفضل من الفرز بالدمج؟", a: "في المتوسط وعندما تكون البيانات عشوائية، لأن الفرز السريع يستخدم ذاكرة أقل" },
    { q: "ما هو تعريف الخوارزمية؟", a: "مجموعة من التعليمات المنطقية المرتبة لحل مشكلة معينة بطريقة منهجية" },
    { q: "لماذا يُعد اختيار الخوارزمية الصحيحة مهماً في تطوير البرامج؟", a: "لأن الخوارزمية الخاطئة قد تستهلك وقتاً وذاكرة أكثر بكثير، مما يؤثر على أداء التطبيق بشكل كبير" },
  ],
  en: [
    { q: "What is the time complexity of bubble sort in the worst case?", a: "O(n²) where n is the size of the data" },
    { q: "What is the main difference between linear search and binary search?", a: "Binary search only works on sorted lists and halves them, while linear search checks each element sequentially" },
    { q: "When is quick sort better than merge sort?", a: "On average with random data, because quick sort uses less memory" },
    { q: "What is the definition of an algorithm?", a: "A set of ordered logical instructions to solve a specific problem systematically" },
    { q: "Why is choosing the right algorithm important in software development?", a: "Because a wrong algorithm may consume much more time and memory, greatly affecting application performance" },
  ],
};
