# -*- coding: utf-8 -*-
"""
Finance App Fairventures - SOP Workflow Diagram
Graphviz dot engine.
- rankdir=LR  → phases flow left-to-right
- constraint=false on intra-phase edges → nodes in each phase share the same
  rank (column) and stack vertically
- Every node filled with a light tint of its role colour for clear visual coding
"""
import os, graphviz

GV_BIN = r'C:\Program Files\Graphviz\bin'
if GV_BIN not in os.environ.get('PATH', ''):
    os.environ['PATH'] = GV_BIN + os.pathsep + os.environ.get('PATH', '')

OUT = r'c:\traceability_project\finance-website\frontend\public\workflow-diagram'

# ── Colours ─ (dark = border/text, light = fill) ─────────────────────────────
DARK = {
    'pm':  '#1b5e20',   # deep green
    'fm':  '#0d47a1',   # deep blue
    'sk':  '#4527a0',   # deep purple
    'ceo': '#e65100',   # deep orange
    'kas': '#880e4f',   # deep pink
    'lap': '#33691e',   # olive green
}
LIGHT = {
    'pm':  '#c8e6c9',
    'fm':  '#bbdefb',
    'sk':  '#d1c4e9',
    'ceo': '#ffe0b2',
    'kas': '#f8bbd0',
    'lap': '#dcedc8',
}
ROLE_LABELS = {
    'pm':  'Project Manager',
    'fm':  'Finance Manager',
    'sk':  'Staff Keuangan',
    'ceo': 'CEO',
    'kas': 'Kasir',
    'lap': 'Staff Lapangan',
}

PHASE_BORDER = ['#2e7d32', '#1565c0', '#6a1b9a', '#bf360c']
PHASE_BG     = ['#f1f8e9', '#e3f2fd', '#ede7f6', '#fbe9e7']
PHASE_LABELS = [
    'Fase 1 — Pengajuan Dana',
    'Fase 2 — Proses E-Banking',
    'Fase 3 — Pembelian Komoditas',
    'Fase 4 — Rekonsiliasi & Kas',
]

# ── Node helper ───────────────────────────────────────────────────────────────
def nd(g, nid, label, role, terminal=False, decision=False):
    d, l = DARK[role], LIGHT[role]
    if terminal:
        g.node(nid, label=label, shape='oval',
               style='filled', fillcolor=d, fontcolor='white',
               fontname='Arial Bold', fontsize='10', width='1.5', height='0.42',
               color=d, penwidth='2')
    elif decision:
        g.node(nid, label=label, shape='diamond',
               style='filled', fillcolor='#fffde7', fontcolor='#4e342e',
               fontname='Arial Bold', fontsize='9', color='#f9a825', penwidth='2.2',
               width='1.9', height='0.95')
    else:
        g.node(nid, label=label, shape='box',
               style='filled,rounded',
               fillcolor=l,           # role-tinted fill
               fontcolor=d,           # dark role text
               fontname='Arial Bold', fontsize='9',
               color=d, penwidth='2',
               width='2.0', height='0.48')

# ── Edge helpers ──────────────────────────────────────────────────────────────
def ia(g, a, b, label='', role=None, color=None, dashed=False):
    """Intra-phase arrow — constraint=false keeps nodes in same column."""
    c = color or (DARK[role] if role else '#546e7a')
    attrs = dict(color=c, fontcolor=c, fontname='Arial Bold',
                 fontsize='8', penwidth='1.5', constraint='false')
    if dashed: attrs['style'] = 'dashed'
    if label:  attrs['label'] = ' ' + label
    g.edge(a, b, **attrs)

def xa(g, a, b, label='', color='#2e7d32', penwidth='2.0', dashed=False):
    """Cross-phase arrow — normal constraint so phases are ordered L→R."""
    attrs = dict(color=color, fontcolor=color, fontname='Arial Bold',
                 fontsize='8', penwidth=penwidth)
    if dashed: attrs['style'] = 'dashed'
    if label:  attrs['label'] = ' ' + label
    g.edge(a, b, **attrs)

# ── Main graph ────────────────────────────────────────────────────────────────
dot = graphviz.Digraph('SOP', engine='dot',
    graph_attr=dict(
        rankdir='LR',
        splines='spline',
        nodesep='0.22',
        ranksep='1.6',
        fontname='Arial',
        bgcolor='white',
        label=('<<FONT POINT-SIZE="16" FACE="Arial Bold" COLOR="#1b5e20">'
               'Alur Kerja SOP — Finance App Fairventures</FONT><BR/>'
               '<FONT POINT-SIZE="9" COLOR="#555">4 Fase  ·  6 Peran</FONT>>'),
        labelloc='t',
        pad='0.5',
        dpi='220',
    ),
    node_attr=dict(margin='0.1,0.06'),
    edge_attr=dict(fontname='Arial Bold', fontsize='8'),
)

# ═══════════════════════════════════════════════════════════════
# FASE 1 — Pengajuan Dana
# ═══════════════════════════════════════════════════════════════
with dot.subgraph(name='cluster_p1') as g:
    g.attr(label=PHASE_LABELS[0], style='filled,rounded',
           fillcolor=PHASE_BG[0], color=PHASE_BORDER[0], penwidth='2.5',
           fontcolor=PHASE_BORDER[0], fontname='Arial Bold', fontsize='10',
           margin='16')

    nd(g, 'start',  'MULAI',                     'pm', terminal=True)
    nd(g, 'n_pr',   'Buat Payment\nRequest',      'pm')
    nd(g, 'n_doc',  'Upload 4 Dokumen\nWajib',    'pm')
    nd(g, 'n_sub',  'Submit PR ke\nFinance Mgr',  'pm')
    nd(g, 'n_val',  'Validasi Dokumen\n& Dana',   'fm')
    nd(g, 'd_dok',  'Dokumen\nLengkap?',          'fm', decision=True)
    nd(g, 'n_ceo1', 'Persetujuan\nFinal CEO',     'ceo')
    nd(g, 'd_ceo1', 'Disetujui\nCEO?',            'ceo', decision=True)

    ia(g, 'start', 'n_pr',   role='pm')
    ia(g, 'n_pr',  'n_doc',  role='pm')
    ia(g, 'n_doc', 'n_sub',  role='pm')
    ia(g, 'n_sub', 'n_val',  color='#546e7a')
    ia(g, 'n_val', 'd_dok',  role='fm')
    ia(g, 'd_dok', 'n_ceo1', label='Ya ✓',            color='#2e7d32')
    ia(g, 'd_dok', 'n_pr',   label='Tidak ✗ Revisi',  color='#c62828', dashed=True)
    ia(g, 'n_ceo1','d_ceo1', role='ceo')

# ═══════════════════════════════════════════════════════════════
# FASE 2 — Proses E-Banking
# ═══════════════════════════════════════════════════════════════
with dot.subgraph(name='cluster_p2') as g:
    g.attr(label=PHASE_LABELS[1], style='filled,rounded',
           fillcolor=PHASE_BG[1], color=PHASE_BORDER[1], penwidth='2.5',
           fontcolor=PHASE_BORDER[1], fontname='Arial Bold', fontsize='10',
           margin='16')

    nd(g, 'n_eb1',  'Input Transaksi\nE-Banking',    'sk')
    nd(g, 'n_eb2',  'Submit ke\nFinance Manager',     'sk')
    nd(g, 'n_fm2',  'Review & Setujui\nTransaksi',    'fm')
    nd(g, 'n_ceo2', 'Persetujuan CEO\nE-Banking',     'ceo')
    nd(g, 'n_arch', 'Upload Bukti\nTransfer',         'sk')
    nd(g, 'n_kas2', 'Konfirmasi\nPenerimaan Dana',    'kas')
    nd(g, 'n_gl2',  'Update Buku\nBesar (GL)',        'sk')

    ia(g, 'n_eb1', 'n_eb2',  role='sk')
    ia(g, 'n_eb2', 'n_fm2',  color='#546e7a')
    ia(g, 'n_fm2', 'n_ceo2', role='ceo')
    ia(g, 'n_ceo2','n_arch', label='Disetujui ✓', color='#2e7d32')
    ia(g, 'n_arch','n_kas2', role='kas')
    ia(g, 'n_kas2','n_gl2',  role='sk')

# ═══════════════════════════════════════════════════════════════
# FASE 3 — Pembelian Komoditas
# ═══════════════════════════════════════════════════════════════
with dot.subgraph(name='cluster_p3') as g:
    g.attr(label=PHASE_LABELS[2], style='filled,rounded',
           fillcolor=PHASE_BG[2], color=PHASE_BORDER[2], penwidth='2.5',
           fontcolor=PHASE_BORDER[2], fontname='Arial Bold', fontsize='10',
           margin='16')

    nd(g, 'n_beli', 'Buat Pembelian\nKomoditas',            'lap')
    nd(g, 'n_kwt',  'Lampirkan Kwitansi\n& Detail Petani',  'lap')
    nd(g, 'n_ver3', 'Verifikasi\nPembelian',                'kas')
    nd(g, 'd_pay',  'Pembayaran\nTunai?',                   'kas', decision=True)
    nd(g, 'n_kas3', 'Catat Kas Keluar\ndi Buku Kas',        'kas')
    nd(g, 'n_gl3',  'Update Buku\nBesar (GL)',              'sk')

    ia(g, 'n_beli', 'n_kwt',  role='lap')
    ia(g, 'n_kwt',  'n_ver3', color='#546e7a')
    ia(g, 'n_ver3', 'd_pay',  role='kas')
    ia(g, 'd_pay',  'n_kas3', label='Tunai ✓',      color='#2e7d32')
    ia(g, 'd_pay',  'n_gl3',  label='Transfer Bank', color='#1565c0', dashed=True)
    ia(g, 'n_kas3', 'n_gl3',  role='sk')

# ═══════════════════════════════════════════════════════════════
# FASE 4 — Rekonsiliasi & Kas
# ═══════════════════════════════════════════════════════════════
with dot.subgraph(name='cluster_p4') as g:
    g.attr(label=PHASE_LABELS[3], style='filled,rounded',
           fillcolor=PHASE_BG[3], color=PHASE_BORDER[3], penwidth='2.5',
           fontcolor=PHASE_BORDER[3], fontname='Arial Bold', fontsize='10',
           margin='16')

    nd(g, 'n_hit', 'Hitung Kas\nHarian',              'kas')
    nd(g, 'n_wa',  'Kirim Rekap\nWhatsApp ≤18:00',    'kas')
    nd(g, 'd_sel', 'Ada\nSelisih?',                   'kas', decision=True)
    nd(g, 'n_inv', 'Investigasi\n& Catat Selisih',    'fm')
    nd(g, 'n_rek', 'Rekonsiliasi\nMingguan (Jumat)',  'fm')
    nd(g, 'n_vgl', 'Verifikasi\nSeluruh GL',          'fm')
    nd(g, 'n_rev', 'Review Laporan\n& Persetujuan',   'ceo')
    nd(g, 'end',   'SELESAI',                         'ceo', terminal=True)

    ia(g, 'n_hit', 'n_wa',  role='kas')
    ia(g, 'n_wa',  'd_sel', role='kas')
    ia(g, 'd_sel', 'n_inv', label='Ya ✗',    color='#c62828')
    ia(g, 'd_sel', 'n_rek', label='Tidak ✓', color='#2e7d32')
    ia(g, 'n_inv', 'n_rek', role='fm')
    ia(g, 'n_rek', 'n_vgl', role='fm')
    ia(g, 'n_vgl', 'n_rev', role='ceo')
    ia(g, 'n_rev', 'end',   role='ceo')

# ═══════════════════════════════════════════════════════════════
# Cross-phase arrows (define L→R phase ordering)
# ═══════════════════════════════════════════════════════════════
xa(dot, 'd_ceo1', 'n_eb1', label='Disetujui → Fase 2', color='#2e7d32')
xa(dot, 'd_ceo1', 'n_pr',  label='Tolak ✗',            color='#c62828', penwidth='1.4', dashed=True)
xa(dot, 'n_gl2',  'n_beli', label='Dana Cair → Fase 3', color='#2e7d32')
xa(dot, 'n_gl3',  'n_hit',  label='Harian → Fase 4',   color='#2e7d32')

# ═══════════════════════════════════════════════════════════════
# Role legend
# ═══════════════════════════════════════════════════════════════
with dot.subgraph(name='cluster_legend') as g:
    g.attr(label='Legenda Peran', style='filled,rounded',
           fillcolor='#fafafa', color='#b0bec5', penwidth='1.2',
           fontname='Arial Bold', fontsize='9', margin='10')
    prev = None
    for key, lbl in ROLE_LABELS.items():
        nid = f'_leg_{key}'
        g.node(nid, label=lbl, shape='box',
               style='filled,rounded',
               fillcolor=LIGHT[key], fontcolor=DARK[key],
               fontname='Arial Bold', fontsize='8.5',
               color=DARK[key], penwidth='1.8',
               width='1.7', height='0.28')
        if prev:
            g.edge(prev, nid, style='invis')
        prev = nid

# ── Render ────────────────────────────────────────────────────────────────────
dot.render(OUT, format='png', cleanup=True)
print('Saved: ' + OUT + '.png')
