export type HelpTopic =
    | 'login'
    | 'home'
    | 'criteria_list'
    | 'criteria_group_detail'
    | 'criteria_group_form'
    | 'criterion_form'
    | 'input_data'
    | 'input_group_form'
    | 'manual_entry'
    | 'excel_upload'
    | 'results';

interface HelpSection {
    title: string;
    paragraphs: string[];
    bullets?: string[];
}

export interface HelpArticle {
    title: string;
    subtitle: string;
    sections: HelpSection[];
}

const DEFAULT_TOPIC: HelpTopic = 'home';

export const helpArticles: Record<HelpTopic, HelpArticle> = {
    login: {
        title: 'Panduan Login',
        subtitle:
            'Halaman ini digunakan untuk autentikasi pengguna agar data keputusan tersimpan per akun.',
        sections: [
            {
                title: 'Tujuan Halaman',
                paragraphs: [
                    'Login menjadi pintu masuk utama aplikasi. Seluruh data kriteria, kandidat, dan hasil perhitungan terikat pada akun yang sedang aktif.',
                    'Dengan pendekatan ini, setiap user memiliki ruang kerja terpisah sehingga data penilaian tidak tercampur antar akun.',
                ],
            },
            {
                title: 'Langkah Penggunaan',
                paragraphs: [
                    'Tekan tombol Continue with Google untuk memulai autentikasi. Setelah berhasil, aplikasi akan mengarahkan Anda ke dashboard utama.',
                ],
                bullets: [
                    'Pastikan koneksi internet stabil saat proses sign-in.',
                    'Gunakan akun yang sama jika ingin melanjutkan data sebelumnya.',
                    'Jika sign-in gagal, ulangi proses beberapa saat kemudian.',
                ],
            },
            {
                title: 'Praktik Baik',
                paragraphs: [
                    'Gunakan akun organisasi atau akun khusus tim HR agar jejak keputusan mudah dilacak dan diaudit.',
                    'Hindari berganti akun secara sering ketika proses input data masih berjalan.',
                ],
            },
        ],
    },
    home: {
        title: 'Panduan Home',
        subtitle:
            'Ringkasan kesiapan data dan pintasan cepat ke modul utama sistem pendukung keputusan.',
        sections: [
            {
                title: 'Apa yang Ditampilkan',
                paragraphs: [
                    'Home menampilkan status global: jumlah group, total criteria, total kandidat, serta indikator grup yang sudah siap dihitung.',
                    'Kartu Configure Criteria dan Input Data berfungsi sebagai shortcut ke proses setup data.',
                ],
            },
            {
                title: 'Alur Kerja yang Disarankan',
                paragraphs: [
                    'Gunakan Home sebagai checkpoint sebelum menjalankan perhitungan hasil.',
                ],
                bullets: [
                    'Buka Configure Criteria jika struktur penilaian belum lengkap.',
                    'Buka Input Data untuk memastikan kandidat dan nilai sudah tersedia.',
                    'Tekan View Results hanya saat minimal satu grup berstatus siap.',
                ],
            },
            {
                title: 'Kapan Data Dianggap Siap',
                paragraphs: [
                    'Satu grup dinyatakan siap apabila memiliki kriteria, memiliki kandidat, dan total bobot kriteria tepat 100%.',
                    'Jika belum siap, perbaiki data pada modul terkait sebelum melanjutkan analisis.',
                ],
            },
        ],
    },
    criteria_list: {
        title: 'Panduan Criteria Groups',
        subtitle:
            'Halaman untuk membuat dan mengelola struktur kelompok kriteria sebagai dasar evaluasi kandidat.',
        sections: [
            {
                title: 'Fungsi Utama',
                paragraphs: [
                    'Setiap criteria group merepresentasikan kerangka penilaian tertentu, misalnya untuk divisi, batch promosi, atau skenario evaluasi yang berbeda.',
                    'Di halaman ini Anda dapat melihat daftar group, metode, serta jumlah criterion di tiap group.',
                ],
            },
            {
                title: 'Interaksi Cepat (Gesture)',
                paragraphs: [
                    'Kartu group mendukung swipe action untuk mempercepat pengelolaan data tanpa membuka banyak dialog.',
                ],
                bullets: [
                    'Swipe kiri/kanan untuk akses Detail, Edit, Copy, dan Delete.',
                    'Gunakan expand/collapse untuk melihat ringkasan group tanpa berpindah halaman.',
                    'Gunakan tombol Tambah Group Criteria untuk membuat group baru.',
                ],
            },
            {
                title: 'Saran Tata Kelola',
                paragraphs: [
                    'Gunakan nama group yang konsisten dan deskriptif agar mudah dipetakan ke konteks bisnis.',
                    'Batasi duplikasi group hanya untuk skenario yang benar-benar berbeda agar data tetap rapi.',
                ],
            },
        ],
    },
    criteria_group_detail: {
        title: 'Panduan Detail Criteria Group',
        subtitle:
            'Pengaturan bobot, lock/unlock bobot, serta pemeliharaan criterion dalam satu group.',
        sections: [
            {
                title: 'Fungsi Halaman',
                paragraphs: [
                    'Halaman ini menampilkan seluruh criterion pada group terpilih termasuk tipe data, dampak (Benefit/Cost), dan bobot masing-masing.',
                    'Total bobot dipantau secara real-time agar tetap memenuhi aturan 100%.',
                ],
            },
            {
                title: 'Lock Weight dan Auto Set',
                paragraphs: [
                    'Fitur lock digunakan untuk mengunci bobot criterion tertentu agar tidak berubah saat distribusi otomatis.',
                    'Status lock tersimpan di database, sehingga tetap konsisten saat aplikasi ditutup atau dibuka kembali.',
                ],
                bullets: [
                    'Lock criterion penting yang bobotnya sudah final.',
                    'Gunakan Set Auto untuk membagi sisa bobot ke criterion yang tidak terkunci.',
                    'Pastikan total akhir 100% sebelum masuk ke tahap hasil.',
                ],
            },
            {
                title: 'Gesture dan Maintenance',
                paragraphs: [
                    'Swipe pada kartu criterion untuk aksi cepat lock/unlock, edit, atau hapus.',
                    'Gunakan halaman ini sebagai titik kontrol kualitas data sebelum input kandidat.',
                ],
            },
        ],
    },
    criteria_group_form: {
        title: 'Panduan Form Criteria Group',
        subtitle:
            'Form pembuatan dan pembaruan metadata group kriteria seperti nama dan deskripsi.',
        sections: [
            {
                title: 'Informasi yang Diisi',
                paragraphs: [
                    'Nama group wajib diisi karena menjadi identitas utama struktur penilaian.',
                    'Deskripsi bersifat opsional namun sangat disarankan untuk menjelaskan konteks penggunaan group.',
                ],
            },
            {
                title: 'Kapan Mengubah Group',
                paragraphs: [
                    'Gunakan mode edit ketika Anda perlu memperjelas nama atau deskripsi tanpa mengubah isi criterion.',
                    'Jika skenario penilaian berbeda jauh, lebih baik membuat group baru daripada menimpa group lama.',
                ],
            },
            {
                title: 'Praktik Penamaan',
                paragraphs: [
                    'Gunakan format yang mudah dikenali tim, misalnya berdasarkan periode, unit, atau level jabatan.',
                ],
                bullets: [
                    'Contoh: Leadership Track 2026',
                    'Contoh: Promosi Supervisor Operasional',
                    'Hindari nama generik seperti Group 1 atau Test',
                ],
            },
        ],
    },
    criterion_form: {
        title: 'Panduan Form Criterion',
        subtitle:
            'Form untuk mendefinisikan indikator penilaian: tipe data, jenis dampak, dan bobot.',
        sections: [
            {
                title: 'Komponen Penting',
                paragraphs: [
                    'Name: nama indikator, misalnya Leadership Potential atau Product Knowledge.',
                    'Data Type: Numeric untuk angka bebas, Scale untuk rentang 1-5.',
                    'Impact Type: Benefit bila nilai tinggi lebih baik, Cost bila nilai rendah lebih baik.',
                ],
            },
            {
                title: 'Pengaturan Bobot',
                paragraphs: [
                    'Bobot menyatakan tingkat kepentingan criterion dalam group.',
                    'Total seluruh bobot pada satu group harus tepat 100% agar perhitungan valid.',
                ],
                bullets: [
                    'Gunakan bobot tinggi untuk indikator strategis.',
                    'Jaga distribusi bobot tetap proporsional.',
                    'Hindari bobot 0 untuk criterion yang masih digunakan.',
                ],
            },
            {
                title: 'Tips Validasi',
                paragraphs: [
                    'Pastikan tipe data dan impact type sesuai definisi bisnis agar hasil ranking tidak bias.',
                    'Perubahan criterion pada group aktif sebaiknya diikuti review data kandidat.',
                ],
            },
        ],
    },
    input_data: {
        title: 'Panduan Input Data',
        subtitle:
            'Area utama untuk mengelola kandidat per group input dan memastikan data siap dihitung.',
        sections: [
            {
                title: 'Struktur Halaman',
                paragraphs: [
                    'Tab Candidates fokus pada daftar kandidat dalam group aktif.',
                    'Tab Group Manager digunakan untuk mengelola group input (aktivasi, edit, duplikasi, hapus).',
                ],
            },
            {
                title: 'Alur Input yang Disarankan',
                paragraphs: [
                    'Mulai dari memilih group input yang tepat, lalu isi kandidat melalui Manual Entry atau Upload Excel.',
                ],
                bullets: [
                    'Pastikan group sudah memiliki criterion sebelum menambah kandidat.',
                    'Gunakan swipe pada item kandidat untuk edit/hapus cepat.',
                    'Lakukan pengecekan jumlah kandidat sebelum pindah ke Results.',
                ],
            },
            {
                title: 'Kualitas Data',
                paragraphs: [
                    'Ketepatan hasil ranking sangat dipengaruhi konsistensi data kandidat di setiap criterion.',
                    'Gunakan satu standar penilaian yang sama di dalam group yang sama.',
                ],
            },
        ],
    },
    input_group_form: {
        title: 'Panduan Form Input Group',
        subtitle:
            'Form untuk membuat group input berbasis template kriteria dan memilih metode perhitungan.',
        sections: [
            {
                title: 'Konsep Group Input',
                paragraphs: [
                    'Group input merepresentasikan sesi evaluasi kandidat yang menggunakan satu set kriteria tertentu.',
                    'Saat group dibuat, kriteria dari template akan disalin untuk menjaga konsistensi penilaian.',
                ],
            },
            {
                title: 'Parameter yang Diatur',
                paragraphs: [
                    'Pilih template kriteria yang paling relevan dengan kasus evaluasi.',
                    'Pilih metode WPM atau SAW sesuai pendekatan analisis yang digunakan organisasi.',
                ],
                bullets: [
                    'WPM cocok untuk pendekatan rasio/perkalian berbobot.',
                    'SAW cocok untuk pendekatan normalisasi dan penjumlahan berbobot.',
                    'Deskripsi group membantu dokumentasi audit keputusan.',
                ],
            },
            {
                title: 'Catatan Operasional',
                paragraphs: [
                    'Hindari mengganti template group setelah proses evaluasi kandidat berjalan.',
                    'Jika kebutuhan berubah besar, buat group baru agar histori tetap bersih.',
                ],
            },
        ],
    },
    manual_entry: {
        title: 'Panduan Manual Entry',
        subtitle:
            'Form pengisian kandidat satu per satu lengkap dengan foto dan nilai per criterion.',
        sections: [
            {
                title: 'Kapan Digunakan',
                paragraphs: [
                    'Manual Entry ideal untuk jumlah kandidat sedikit, koreksi data cepat, atau validasi akhir sebelum perhitungan.',
                ],
            },
            {
                title: 'Langkah Pengisian',
                paragraphs: [
                    'Isi nama kandidat, tambahkan foto (opsional), lalu masukkan nilai untuk setiap criterion.',
                ],
                bullets: [
                    'Untuk criterion Numeric, isi angka sesuai skala bisnis.',
                    'Untuk criterion Scale, gunakan slider 1-5 secara konsisten.',
                    'Perhatikan aturan metode: WPM mensyaratkan nilai lebih dari 0.',
                ],
            },
            {
                title: 'Kontrol Akurasi',
                paragraphs: [
                    'Gunakan definisi indikator yang jelas agar penilaian antar kandidat sebanding.',
                    'Lakukan review silang untuk data kandidat dengan skor ekstrem.',
                ],
            },
        ],
    },
    excel_upload: {
        title: 'Panduan Upload Excel',
        subtitle:
            'Import massal kandidat dari file Excel dengan validasi otomatis sebelum data disimpan.',
        sections: [
            {
                title: 'Persiapan File',
                paragraphs: [
                    'Gunakan template kolom yang sesuai dengan kriteria pada group aktif.',
                    'Pastikan nama kolom dan format nilai konsisten agar parser dapat membaca data dengan benar.',
                ],
            },
            {
                title: 'Proses Validasi',
                paragraphs: [
                    'Setelah file dipilih, sistem menampilkan preview kandidat dan daftar error jika ada.',
                    'Data hanya dapat diimport saat seluruh error validasi telah diperbaiki.',
                ],
                bullets: [
                    'Periksa baris dengan nilai kosong atau tidak valid.',
                    'Pastikan semua criterion memiliki nilai.',
                    'Gunakan opsi Choose Another File untuk upload revisi.',
                ],
            },
            {
                title: 'Rekomendasi Operasional',
                paragraphs: [
                    'Simpan versi sumber data sebelum import untuk keperluan audit.',
                    'Lakukan import bertahap jika volume data sangat besar.',
                ],
            },
        ],
    },
    results: {
        title: 'Panduan Results',
        subtitle:
            'Halaman hasil ranking kandidat berbasis metode WPM atau SAW per group input.',
        sections: [
            {
                title: 'Apa yang Dihitung',
                paragraphs: [
                    'Sistem menghitung skor kandidat berdasarkan bobot dan nilai criterion, lalu mengurutkannya menjadi ranking.',
                    'Hasil ditampilkan per group input agar konteks evaluasi tetap jelas.',
                ],
            },
            {
                title: 'Membaca Hasil',
                paragraphs: [
                    'Gunakan kartu group untuk melihat status kesiapan data dan daftar ranking kandidat.',
                    'Kandidat peringkat teratas dapat dijadikan kandidat prioritas untuk review lanjutan.',
                ],
                bullets: [
                    'Expand group untuk melihat kandidat detail.',
                    'Tap atau swipe kandidat untuk melihat nilai per criterion.',
                    'Gunakan Refresh Results setelah ada perubahan data input.',
                ],
            },
            {
                title: 'Interpretasi Profesional',
                paragraphs: [
                    'Ranking adalah alat bantu pengambilan keputusan, bukan satu-satunya keputusan final.',
                    'Kombinasikan hasil kuantitatif dengan pertimbangan kualitatif (rekam jejak, potensi, dan kebutuhan organisasi).',
                ],
            },
        ],
    },
};

export const getHelpArticle = (topic?: string): HelpArticle => {
    if (!topic) {
        return helpArticles[DEFAULT_TOPIC];
    }

    if (topic in helpArticles) {
        return helpArticles[topic as HelpTopic];
    }

    return helpArticles[DEFAULT_TOPIC];
};
