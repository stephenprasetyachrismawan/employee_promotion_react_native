# AHP Feature Implementation Plan
## Employee Promotion Decision Support System

> **Target:** Claude Code / Codex Advanced Prompt  
> **Stack:** React Native + Expo + Firebase Firestore  
> **Base project:** `employee_promotion_decision_support` (codebase sudah terlampir)

---

## CONTEXT & OBJECTIVE

Aplikasi ini adalah Decision Support System (DSS) untuk promosi karyawan yang sudah memiliki metode WPM dan SAW. Tugas ini adalah **menambahkan fitur AHP (Analytic Hierarchy Process)** dengan dua tujuan berbeda:

1. **AHP Weighting** — Menggunakan AHP murni untuk **menentukan bobot kriteria** secara ilmiah (pengganti set bobot manual di menu Criteria Group Detail). Output-nya adalah nilai bobot (`weight %`) yang ditulis balik ke field `weight` di setiap criterion.

2. **AHP Input** — Fitur AHP full-blown sebagai **metode keputusan alternatif**, dengan hierarki Goal → Criteria → Sub-Criteria → Alternatives, terpisah dari alur WPM/SAW.

---

## PART 1: AHP WEIGHTING (Integrasi ke Criteria Group Detail)

### 1.1 Konsep

AHP Weighting adalah proses **pairwise comparison antar criteria** dalam satu Criteria Group untuk menghasilkan bobot yang konsisten secara matematis. Hasilnya langsung menimpa nilai `weight` di Firestore (field yang sama yang dipakai WPM/SAW).

### 1.2 Entry Point

Di screen `CriteriaGroupDetailScreen.tsx`, tambahkan tombol **"Set Weight via AHP"** di samping tombol "Set Auto" yang sudah ada. Tombol ini hanya muncul jika `group.groupType === 'criteria'` (bukan input group read-only).

### 1.3 Alur Navigasi AHP Weighting

```
CriteriaGroupDetailScreen
    └─► AHPWeightingScreen  (modal full-screen atau push navigation)
            ├── Step 1: Pairwise Comparison Table
            ├── Step 2: Priority Vector Calculation (eigen vector approximation)
            ├── Step 3: Consistency Check (CI, RI, CR)
            └── Step 4: Confirm & Apply Weights → kembali ke CriteriaGroupDetailScreen
```

### 1.4 Firestore Schema Tambahan (AHP Weighting Session)

```
/users/{userId}/ahpWeightingSessions/{sessionId}
  - groupId: string
  - criteriaIds: string[]           // urutan criteria saat sesi dibuat
  - criteriaNames: string[]         // snapshot nama untuk display
  - pairwiseMatrix: number[][]      // n×n matrix nilai perbandingan (1/9 s/d 9)
  - priorityVector: number[]        // bobot ternormalisasi hasil eigen
  - lambdaMax: number
  - ci: number
  - ri: number
  - cr: number
  - isConsistent: boolean           // CR < 0.1
  - appliedAt: Timestamp | null     // null jika belum diapply
  - createdAt: Timestamp
  - updatedAt: Timestamp
```

> **Catatan:** Sesi disimpan agar user bisa kembali melihat riwayat pembobotan AHP sebelumnya.

### 1.5 Screen: AHPWeightingScreen

#### Layout & UX

```
┌─────────────────────────────────────────────────────────┐
│  ← Back        AHP Weighting: {Group Name}         [?]  │
├─────────────────────────────────────────────────────────┤
│  STEP INDICATOR:  [1] ──── [2] ──── [3] ──── [4]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [KONTEN STEP AKTIF — lihat detail per step di bawah]   │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  [← Prev Step]              [Next Step / Apply →]       │
└─────────────────────────────────────────────────────────┘
```

#### Step 1 — Pairwise Comparison Table

- Tampilkan tabel n×n interaktif dengan criteria sebagai baris dan kolom
- Diagonal selalu = 1 (disabled, tidak bisa diubah)
- Sel di atas diagonal (upper triangle) = input aktif, nilai 1–9 (bisa fraksional: 1/2, 1/3, ..., 1/9)
- Sel di bawah diagonal (lower triangle) = otomatis = 1/nilai_atas (read-only, tampil sebagai desimal 2 angka)
- UI Input: gunakan **Picker horizontal per sel** dengan opsi: `1/9, 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6, 7, 8, 9`
- Label skala ditampilkan di bawah tabel: `1=Sama penting, 3=Sedikit lebih penting, 5=Lebih penting, 7=Jauh lebih penting, 9=Mutlak lebih penting`
- Scroll horizontal jika criteria > 4

```
Contoh tampilan tabel (n=3, criteria: C1, C2, C3):

        C1      C2      C3
C1  [  1  ] [  3  ] [  5  ]
C2  [ 0.33] [  1  ] [  2  ]
C3  [ 0.20] [ 0.50] [  1  ]
```

#### Step 2 — Priority Vector & Calculation Detail

Tampilkan:
- **Column Sum:** jumlah tiap kolom dari matrix
- **Normalized Matrix:** tiap sel dibagi column sum kolom-nya
- **Priority Vector (w):** rata-rata baris dari normalized matrix (= eigen vector approx)
- Semua angka ditampilkan 4 desimal
- Tabel scroll-friendly

Formula yang ditampilkan:
```
w_i = (1/n) × Σ (a_ij / Σ a_kj)
```

#### Step 3 — Consistency Analysis

Tampilkan card-card hasil:

```
┌──────────────────────────────────────────┐
│  Weighted Sum Vector                      │
│  [A] × [w] = [Aw]                        │
│  Nilai per criteria: ...                  │
├──────────────────────────────────────────┤
│  λmax  =  Σ(Aw_i / w_i) / n  =  X.XXXX  │
├──────────────────────────────────────────┤
│  CI  =  (λmax - n) / (n - 1)  =  X.XXXX │
├──────────────────────────────────────────┤
│  RI  =  X.XX  (tabel Saaty, n=?)         │
├──────────────────────────────────────────┤
│  CR  =  CI / RI  =  X.XXXX               │
│  Status: ✅ Konsisten (CR < 0.1)         │
│       atau ⚠️ Tidak Konsisten (CR ≥ 0.1) │
└──────────────────────────────────────────┘
```

Tabel RI Saaty (hardcode):
| n | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|---|---|---|---|
| RI | 0 | 0 | 0.58 | 0.90 | 1.12 | 1.24 | 1.32 | 1.41 | 1.45 | 1.49 |

Jika tidak konsisten, tampilkan saran: *"Pertimbangkan untuk merevisi perbandingan berpasangan agar CR < 0.1"*. Tombol **"← Revisi Pairwise"** tersedia.

#### Step 4 — Konfirmasi & Apply

Tampilkan summary bobot:

```
┌──────────────────────────────────────────┐
│  Hasil Pembobotan AHP                    │
│                                          │
│  Criteria A        35.2%  ████████░░░   │
│  Criteria B        28.7%  ███████░░░░   │
│  Criteria C        21.6%  █████░░░░░░   │
│  Criteria D        14.5%  ████░░░░░░░   │
│                                          │
│  Total: 100.0%                           │
│                                          │
│  CR = 0.042 ✅ Konsisten                 │
└──────────────────────────────────────────┘

[Terapkan Bobot Ini]    [Simpan Tanpa Apply]
```

- **Terapkan Bobot Ini**: update semua `weight` di Firestore, tandai session `appliedAt`, kembali ke CriteriaGroupDetailScreen
- **Simpan Tanpa Apply**: simpan session saja tanpa mengubah bobot aktif

---

## PART 2: AHP INPUT (Fitur AHP Full Hierarki)

### 2.1 Konsep

AHP Input adalah fitur mandiri (tidak terhubung ke WPM/SAW pipeline) yang mengimplementasikan AHP lengkap:

```
Goal (satu tujuan keputusan)
  └── Criteria (n buah)
        └── Sub-Criteria (opsional, m buah per criterion)
              └── Alternatives (opsi/kandidat, k buah)
```

Setiap level memiliki pairwise comparison matrix-nya sendiri. Output akhir adalah **ranking alternatives** berdasarkan global priority score.

### 2.2 Entry Point Navigasi

Tambahkan tab atau menu item baru **"AHP Input"** di bottom tab bar (antara Input dan Results), atau sebagai sub-navigasi di dalam tab existing. Karena bottom tab sudah punya 4 item (Home, Criteria, Input, Results), pertimbangkan menempatkannya sebagai menu di **HomeScreen** atau sebagai tab ke-5 jika desain memungkinkan.

Rekomendasi: tambahkan sebagai **tab ke-5** dengan icon `brain` atau `project-diagram`.

### 2.3 Firestore Schema: AHP Input

```
/users/{userId}/ahpProjects/{projectId}
  - name: string
  - goal: string                    // deskripsi tujuan keputusan
  - status: 'draft' | 'complete'
  - hasSub: boolean                 // apakah menggunakan sub-criteria
  - createdAt: Timestamp
  - updatedAt: Timestamp

/users/{userId}/ahpProjects/{projectId}/ahpCriteria/{criteriaId}
  - name: string
  - order: number
  - weight: number                  // dari pairwise criteria level
  - createdAt: Timestamp

/users/{userId}/ahpProjects/{projectId}/ahpSubCriteria/{subId}
  - criteriaId: string              // parent criterion
  - name: string
  - order: number
  - localWeight: number             // bobot dalam parent criterion
  - globalWeight: number            // localWeight × criterionWeight
  - createdAt: Timestamp

/users/{userId}/ahpProjects/{projectId}/ahpAlternatives/{altId}
  - name: string
  - order: number
  - createdAt: Timestamp

/users/{userId}/ahpProjects/{projectId}/ahpPairwiseMatrices/{matrixId}
  - level: 'criteria' | 'sub_criteria' | 'alternative_per_criterion' | 'alternative_per_sub'
  - parentId: string | null         // criteriaId jika level alternative_per_criterion/sub
  - criteriaIds: string[]           // untuk criteria/sub level
  - alternativeIds: string[]        // untuk alternative level
  - matrix: number[][]              // nilai raw pairwise
  - priorityVector: number[]
  - lambdaMax: number
  - ci: number
  - ri: number
  - cr: number
  - isConsistent: boolean
  - updatedAt: Timestamp
```

> **Penting:** Setiap kali criteria/sub-criteria/alternatives ditambah atau dihapus, semua matrix terkait harus di-reset dan user diarahkan untuk mengisi ulang. Tampilkan notifikasi yang jelas.

### 2.4 Navigasi AHP Input (Step-by-Step Flow)

```
AHPProjectListScreen
    └─► AHPProjectScreen (wizard multi-step)
            ├── Step 1: Project Setup (Nama, Goal)
            ├── Step 2: Criteria Setup (tambah/edit/hapus criteria)
            ├── Step 3: Criteria Pairwise Comparison
            ├── Step 4: [Jika hasSub] Sub-Criteria Setup per Criterion
            ├── Step 5: [Jika hasSub] Sub-Criteria Pairwise per Criterion
            ├── Step 6: Alternatives Setup (tambah/edit/hapus alternatif)
            ├── Step 7: Alternative Pairwise per Criterion (atau per Sub-Criteria)
            └── Step 8: Results & Global Ranking
```

### 2.5 Screens Detail

#### AHPProjectListScreen

```
┌─────────────────────────────────────────────────────────┐
│  AHP Projects                                      [?]  │
├─────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────┐             │
│  │ 📊 Seleksi Promosi Q4 2024            │             │
│  │ Goal: Pilih kandidat terbaik          │             │
│  │ 4 criteria · 12 alternatives          │             │
│  │ Status: ✅ Complete  CR: OK           │             │
│  └───────────────────────────────────────┘             │
│  ┌───────────────────────────────────────┐             │
│  │ 📊 Evaluasi Manajer Regional          │             │
│  │ Status: ⏳ Draft (Step 3/8)           │             │
│  └───────────────────────────────────────┘             │
├─────────────────────────────────────────────────────────┤
│  [+ Buat AHP Project Baru]                              │
└─────────────────────────────────────────────────────────┘
```

Swipe action: Edit, Duplicate, Delete (sama dengan pola existing di codebase).

#### Step 1 — Project Setup

- Input: Nama Project (required)
- Input: Goal / Tujuan Keputusan (required, textarea)
- Toggle: "Gunakan Sub-Criteria?" (mengaktifkan Step 4 & 5)
- Simpan ke Firestore saat Next

#### Step 2 — Criteria Setup

- FlatList criteria yang sudah ditambahkan
- Tombol "Tambah Criterion" → inline text input atau modal kecil
- Reorder via drag-and-drop (gunakan `react-native-gesture-handler` yang sudah ada)
- Minimum 2 criteria untuk bisa lanjut
- **Warning banner**: "Mengubah jumlah criteria akan mereset matrix perbandingan di Step 3"
- Swipe untuk edit/hapus

#### Step 3 — Criteria Pairwise Comparison

Sama persis dengan Step 1 di AHP Weighting (tabel n×n interaktif).  
Setelah tabel diisi:
- Tampilkan Priority Vector langsung di bawah tabel (live update saat nilai berubah)
- Tampilkan CR dan status konsistensi

```
┌─────────────────────────────────────────────────────────┐
│  Pairwise Comparison: Criteria Level                    │
├─────────────────────────────────────────────────────────┤
│  [Tabel n×n — scroll horizontal jika perlu]             │
├─────────────────────────────────────────────────────────┤
│  Priority Vector:                                       │
│  ● Pengalaman Kerja    0.4523                          │
│  ● Kompetensi          0.3102                          │
│  ● Kepemimpinan        0.2375                          │
├─────────────────────────────────────────────────────────┤
│  λmax: 3.0536 | CI: 0.0268 | RI: 0.58 | CR: 0.046 ✅  │
└─────────────────────────────────────────────────────────┘
```

#### Step 4 — Sub-Criteria Setup (kondisional)

- Untuk setiap criterion, user bisa menambahkan sub-criteria
- UI: accordion per criterion, masing-masing bisa di-expand untuk tambah sub
- Minimum 2 sub jika criterion ingin menggunakan sub-criteria
- Warning yang sama jika jumlah sub-criteria berubah

#### Step 5 — Sub-Criteria Pairwise per Criterion (kondisional)

- Satu tabel pairwise per criterion yang memiliki sub-criteria
- Tampilkan dalam tab atau accordion per criterion
- Show local weight dan global weight:
  - `globalWeight = localWeight × criterionWeight`

#### Step 6 — Alternatives Setup

- Input nama alternatives (kandidat/opsi)
- Minimum 2 alternatives
- **Warning banner**: "Mengubah jumlah alternatives akan mereset semua matrix di Step 7"
- Tidak bisa menambah sembarangan — harus via tombol "Tambah Alternative"
- Tampilkan jumlah matrix yang akan terpengaruh: *"Menambah alternative akan mereset X matrix pairwise"*

#### Step 7 — Alternative Pairwise per Criterion

- Satu tabel pairwise alternatives untuk **setiap criterion** (atau setiap sub-criteria jika hasSub)
- Jumlah tabel = n criteria × (k alternatives × k alternatives matrix)
- UI: Tab bar horizontal per criterion di bagian atas, scroll di bawah untuk tabel
- Setiap tabel menampilkan:
  - Pairwise matrix alternatives terhadap criterion ini
  - Priority vector alternatives untuk criterion ini
  - CR status

```
┌─────────────────────────────────────────────────────────┐
│  Alternative Comparison                                 │
│  ─────────────────────────────────────────────────────  │
│  [Pengalaman] [Kompetensi] [Kepemimpinan]              │
│                   ↑ tab aktif                          │
├─────────────────────────────────────────────────────────┤
│  Terhadap kriteria: Kompetensi                          │
│                                                         │
│  [Tabel pairwise alternatives]                          │
│                                                         │
│  CR: 0.032 ✅                                          │
└─────────────────────────────────────────────────────────┘
```

#### Step 8 — Results & Global Ranking

Tampilkan hasil akhir AHP secara komprehensif:

```
┌─────────────────────────────────────────────────────────┐
│  🏆 AHP Ranking Results                                 │
│  Goal: Pilih Kandidat Promosi Terbaik                   │
├─────────────────────────────────────────────────────────┤
│  Global Priority Score:                                 │
│                                                         │
│  #1  Ahmad Fauzi         0.3421  ████████████░░░  🏆   │
│  #2  Siti Rahayu         0.2876  ██████████░░░░░       │
│  #3  Budi Santoso        0.2103  ███████░░░░░░░░       │
│  #4  Dewi Kusuma         0.1600  █████░░░░░░░░░░       │
├─────────────────────────────────────────────────────────┤
│  Breakdown per Criteria (expand untuk detail):          │
│  ▼ Pengalaman Kerja (w=0.452)                           │
│    Ahmad: 0.412 | Siti: 0.311 | Budi: 0.177 | Dewi:... │
│  ▶ Kompetensi (w=0.310)                                 │
│  ▶ Kepemimpinan (w=0.238)                               │
├─────────────────────────────────────────────────────────┤
│  Consistency Summary:                                   │
│  Criteria Level      CR: 0.046 ✅                       │
│  vs Pengalaman       CR: 0.031 ✅                       │
│  vs Kompetensi       CR: 0.078 ✅                       │
│  vs Kepemimpinan     CR: 0.052 ✅                       │
└─────────────────────────────────────────────────────────┘
```

Formula Global Priority:
```
P_i = Σ_j (w_j × v_ij)
```
Di mana `w_j` = bobot criteria j, `v_ij` = local priority alternative i terhadap criteria j.

---

## PART 3: UTILITY — AHP Math Library

Buat file baru: `src/utils/ahp.ts`

```typescript
// Interfaces
interface AHPMatrixResult {
  normalizedMatrix: number[][];
  columnSums: number[];
  priorityVector: number[];
  weightedSumVector: number[];
  consistencyVector: number[];
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  isConsistent: boolean;
}

// RI table Saaty
const RI_TABLE: Record<number, number> = {
  1: 0, 2: 0, 3: 0.58, 4: 0.90, 5: 1.12,
  6: 1.24, 7: 1.32, 8: 1.41, 9: 1.45, 10: 1.49,
};

// Core functions
function computeColumnSums(matrix: number[][]): number[]
function normalizeMatrix(matrix: number[][], columnSums: number[]): number[][]
function computePriorityVector(normalizedMatrix: number[][]): number[]
function computeWeightedSumVector(matrix: number[][], priorityVector: number[]): number[]
function computeLambdaMax(weightedSumVector: number[], priorityVector: number[]): number
function computeCI(lambdaMax: number, n: number): number
function computeRI(n: number): number
function computeCR(ci: number, ri: number): number

// Main entry point
export function analyzeAHPMatrix(matrix: number[][]): AHPMatrixResult

// Helper: generate default matrix (semua 1)
export function createDefaultMatrix(n: number): number[][]

// Helper: set reciprocal
export function setReciprocal(matrix: number[][], i: number, j: number, value: number): number[][]

// Helper: compute global priorities
export function computeGlobalPriorities(
  criteriaWeights: number[],
  alternativePriorityVectors: number[][]  // [nCriteria][nAlternatives]
): number[]
```

---

## PART 4: SERVICE LAYER

Buat file baru: `src/database/services/AHPService.ts`

Fungsi-fungsi yang diperlukan:
```typescript
// AHP Weighting
createWeightingSession(userId, groupId, criteriaIds) → sessionId
updatePairwiseMatrix(userId, sessionId, matrix) → AHPMatrixResult
applyWeightsToGroup(userId, sessionId) → void
getWeightingSessionByGroup(userId, groupId) → session | null

// AHP Projects
createProject(userId, name, goal, hasSub) → projectId
updateProject(userId, projectId, data) → void
deleteProject(userId, projectId) → void

// AHP Criteria
addCriteria(userId, projectId, name) → criterionId
deleteCriteria(userId, projectId, criterionId) → void  // resets affected matrices
reorderCriteria(userId, projectId, orderedIds) → void

// AHP Sub-Criteria
addSubCriteria(userId, projectId, criterionId, name) → subId
deleteSubCriteria(userId, projectId, subId) → void

// AHP Alternatives
addAlternative(userId, projectId, name) → altId
deleteAlternative(userId, projectId, altId) → void  // resets ALL alternative matrices

// AHP Matrices
saveMatrix(userId, projectId, matrixData) → matrixId
getMatricesByProject(userId, projectId) → matrix[]
resetMatricesForLevel(userId, projectId, level, parentId?) → void

// Computation
computeAndSaveResults(userId, projectId) → GlobalResults
getProjectResults(userId, projectId) → GlobalResults | null
```

---

## PART 5: NAVIGATION CHANGES

### 5.1 Bottom Tab (AppNavigator.tsx)

Tambah tab baru:
```typescript
<Tab.Screen name="AHP" component={AHPNavigator} />
// icon: 'project-diagram' atau 'brain'
```

### 5.2 AHPNavigator (baru: `src/navigation/AHPNavigator.tsx`)

```typescript
Stack.Navigator:
  - AHPProjectListScreen     (main)
  - AHPWeightingScreen       (dari CriteriaGroupDetail juga bisa push ke sini)
  - AHPProjectWizardScreen   (wrapper step wizard)
  - AHPStepSetupScreen       (Step 1 & 2)
  - AHPPairwiseScreen        (Step 3, 5, 7 — reusable component)
  - AHPSubCriteriaScreen     (Step 4)
  - AHPAlternativesScreen    (Step 6)
  - AHPResultsScreen         (Step 8)
```

### 5.3 CriteriaNavigator.tsx — Tambah Route

```typescript
<Stack.Screen name="AHPWeighting" component={AHPWeightingScreen} />
```

---

## PART 6: REUSABLE COMPONENTS (baru)

### `src/components/ahp/PairwiseTable.tsx`
- Props: `criteria: string[]`, `matrix: number[][]`, `onChange: (i,j,value) => void`, `disabled?: boolean`
- Render tabel interaktif dengan Picker tiap sel
- Export untuk dipakai di AHPWeightingScreen dan AHPPairwiseScreen

### `src/components/ahp/ConsistencyCard.tsx`
- Props: `lambdaMax, ci, ri, cr, n, isConsistent`
- Tampilkan semua angka CR dengan warna sesuai status

### `src/components/ahp/PriorityBar.tsx`
- Props: `items: {name: string, weight: number}[]`
- Bar chart horizontal sederhana untuk tampilan bobot/ranking

### `src/components/ahp/StepIndicator.tsx`
- Props: `steps: string[]`, `currentStep: number`
- Progress bar horizontal dengan nomor dan label step

---

## PART 7: UPDATE & CASCADE RULES

### Aturan Cascade (KRITIS — harus diimplementasikan):

| Event | Matrix yang di-reset |
|---|---|
| Tambah/hapus Criterion | Matrix criteria level + semua matrix alternative per criterion |
| Tambah/hapus Sub-Criterion pada Criterion X | Matrix sub X + matrix alternative per sub X |
| Tambah/hapus Alternative | SEMUA matrix alternative (semua criterion/sub) |
| Reorder criteria/sub/alt | Tidak perlu reset, tapi perlu update urutan di matrix |

### Implementasi Reset:
- Saat reset, **hapus dokumen matrix dari Firestore** dan tampilkan state kosong
- Tampilkan **banner warning** sebelum operasi destructive:
  > *"Menghapus criteria ini akan mereset 3 matrix pairwise. Lanjutkan?"*
- Gunakan `confirmDialog()` yang sudah ada di `src/utils/dialog.ts`

---

## PART 8: HELP ARTICLES

Tambah ke `src/content/helpArticles.ts`:
```typescript
'ahp_weighting': { ... }
'ahp_project_list': { ... }
'ahp_pairwise': { ... }
'ahp_results': { ... }
```

---

## PART 9: TYPES (tambah ke `src/types/index.ts`)

```typescript
// AHP Types
export interface AHPWeightingSession {
  id: string;
  groupId: string;
  criteriaIds: string[];
  criteriaNames: string[];
  pairwiseMatrix: number[][];
  priorityVector: number[];
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  isConsistent: boolean;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AHPProject {
  id: string;
  name: string;
  goal: string;
  status: 'draft' | 'complete';
  hasSub: boolean;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface AHPCriterion {
  id: string;
  projectId: string;
  name: string;
  order: number;
  weight: number;
}

export interface AHPSubCriterion {
  id: string;
  projectId: string;
  criterionId: string;
  name: string;
  order: number;
  localWeight: number;
  globalWeight: number;
}

export interface AHPAlternative {
  id: string;
  projectId: string;
  name: string;
  order: number;
}

export interface AHPMatrix {
  id: string;
  projectId: string;
  level: 'criteria' | 'sub_criteria' | 'alternative_per_criterion' | 'alternative_per_sub';
  parentId: string | null;
  matrix: number[][];
  priorityVector: number[];
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  isConsistent: boolean;
  updatedAt: string;
}

export interface AHPGlobalResult {
  alternativeId: string;
  alternativeName: string;
  globalScore: number;
  rank: number;
  scorePerCriteria: Record<string, number>;
}

export interface AHPMatrixAnalysis {
  normalizedMatrix: number[][];
  columnSums: number[];
  priorityVector: number[];
  weightedSumVector: number[];
  consistencyVector: number[];
  lambdaMax: number;
  ci: number;
  ri: number;
  cr: number;
  isConsistent: boolean;
}
```

---

## PART 10: FILES YANG PERLU DIBUAT / DIMODIFIKASI

### File Baru:
```
src/utils/ahp.ts
src/database/services/AHPService.ts
src/navigation/AHPNavigator.tsx
src/components/ahp/PairwiseTable.tsx
src/components/ahp/ConsistencyCard.tsx
src/components/ahp/PriorityBar.tsx
src/components/ahp/StepIndicator.tsx
src/screens/ahp/AHPProjectListScreen.tsx
src/screens/ahp/AHPWeightingScreen.tsx
src/screens/ahp/AHPProjectWizardScreen.tsx  (wrapper state management)
src/screens/ahp/AHPStep1SetupScreen.tsx
src/screens/ahp/AHPStep2CriteriaScreen.tsx
src/screens/ahp/AHPStep3PairwiseScreen.tsx
src/screens/ahp/AHPStep4SubCriteriaScreen.tsx
src/screens/ahp/AHPStep5SubPairwiseScreen.tsx
src/screens/ahp/AHPStep6AlternativesScreen.tsx
src/screens/ahp/AHPStep7AltPairwiseScreen.tsx
src/screens/ahp/AHPStep8ResultsScreen.tsx
```

### File Dimodifikasi:
```
src/navigation/AppNavigator.tsx          ← tambah AHP tab
src/navigation/CriteriaNavigator.tsx     ← tambah route AHPWeighting
src/screens/CriteriaGroupDetailScreen.tsx ← tambah tombol "Set Weight via AHP"
src/types/index.ts                       ← tambah AHP types
src/content/helpArticles.ts              ← tambah AHP help articles
```

---

## PART 11: IMPLEMENTATION ORDER (untuk Claude Code)

Implementasikan dalam urutan berikut agar tidak ada dependency error:

1. `src/types/index.ts` — tambah semua AHP types
2. `src/utils/ahp.ts` — pure math, no dependencies
3. `src/database/services/AHPService.ts` — Firestore operations
4. `src/components/ahp/*.tsx` — reusable UI components
5. `src/screens/ahp/AHPWeightingScreen.tsx` — simpler, standalone
6. `src/navigation/AHPNavigator.tsx`
7. `src/navigation/AppNavigator.tsx` — update tab bar
8. `src/navigation/CriteriaNavigator.tsx` — tambah route
9. `src/screens/CriteriaGroupDetailScreen.tsx` — tambah entry point button
10. `src/screens/ahp/AHP*Screen.tsx` — semua screen AHP Input (Step 1–8)
11. `src/content/helpArticles.ts` — help content
12. Testing & validation semua CR calculation

---

## NOTES UNTUK IMPLEMENTASI

- **Jangan** ubah struktur Firestore yang sudah ada (criteria, candidates, weights tetap sama)
- AHP Weighting hanya **menulis ulang** field `weight` di criteria collection yang sudah ada
- AHP Input adalah **collection terpisah** (`ahpProjects`) yang tidak berinteraksi dengan criteria/candidates existing
- Semua perhitungan AHP dilakukan di **client-side** (tidak perlu cloud function) karena sudah cukup ringan untuk n ≤ 15
- Gunakan **pola SwipeableRow** yang sudah ada untuk list actions
- Gunakan **SectionDisclosure** yang sudah ada untuk collapse/expand detail kalkulasi
- Gunakan **MotionView** untuk animasi entrance setiap step
- Semua angka desimal: tampilkan 4 digit di tabel perhitungan, 2 digit di summary/ranking
- Warna konsisten: `colors.success` untuk CR ✅, `colors.warning` untuk CR ⚠️