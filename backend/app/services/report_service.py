import os
import matplotlib
# Force matplotlib to use a non-interactive backend (Agg) to prevent GUI errors on server
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

class ReportService:
    @staticmethod
    def generate_pdf_report(report_path: str, video_name: str, prediction: str, confidence: float, 
                            frames_analyzed: int, suspicious_frames_count: int, analysis_results: dict, job_id: str):
        """
        Generates a professional forensic PDF report using ReportLab and Matplotlib.
        """
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
        temp_chart_path = os.path.join(base_dir, "reports", f"chart_{job_id}.png")
        
        # 1. Create Matplotlib Charts
        ReportService._generate_charts(analysis_results, temp_chart_path)
        
        # 2. Setup ReportLab Document
        doc = SimpleDocTemplate(
            report_path,
            pagesize=letter,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        
        # Define Custom Styles for Neon Dark / Professional Layout
        title_style = ParagraphStyle(
            'ReportTitle',
            parent=styles['Heading1'],
            fontName='Helvetica-Bold',
            fontSize=24,
            leading=28,
            textColor=colors.HexColor('#0F172A'), # Slate 900
            spaceAfter=6
        )
        
        subtitle_style = ParagraphStyle(
            'ReportSubtitle',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=12,
            textColor=colors.HexColor('#64748B'), # Slate 500
            spaceAfter=20
        )

        h2_style = ParagraphStyle(
            'SectionHeader',
            parent=styles['Heading2'],
            fontName='Helvetica-Bold',
            fontSize=14,
            leading=18,
            textColor=colors.HexColor('#1E293B'),
            spaceBefore=14,
            spaceAfter=8,
            keepWithNext=True
        )

        body_style = ParagraphStyle(
            'ReportBody',
            parent=styles['Normal'],
            fontName='Helvetica',
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#334155')
        )
        
        verdict_color = '#EF4444' if prediction == "FAKE" else '#10B981'
        verdict_bg = '#FEE2E2' if prediction == "FAKE" else '#D1FAE5'
        
        verdict_title_style = ParagraphStyle(
            'VerdictTitle',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=18,
            leading=22,
            textColor=colors.HexColor(verdict_color),
            alignment=1 # Centered
        )

        verdict_desc_style = ParagraphStyle(
            'VerdictDesc',
            parent=styles['Normal'],
            fontName='Helvetica-Bold',
            fontSize=12,
            leading=16,
            textColor=colors.HexColor('#1E293B'),
            alignment=1 # Centered
        )

        story = []
        
        # --- HEADER SECTION ---
        story.append(Paragraph("TRUTHLENS AI FORENSICS", title_style))
        story.append(Paragraph(f"Forensic Verification Deepfake Analysis Report • Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", subtitle_style))
        
        # --- SUMMARY TABLE & VERDICT CARD ---
        metadata_data = [
            [Paragraph("<b>Video Analysis Metadata</b>", body_style), ""],
            ["Job Identifier:", job_id],
            ["Target Video File Name:", video_name],
            ["Total Frames Sampled:", str(frames_analyzed)],
            ["Frames with Detected Faces:", str(analysis_results.get("frames_with_faces_count", 0))],
            ["Suspicious Frames Flagged:", str(suspicious_frames_count)]
        ]
        
        metadata_table = Table(metadata_data, colWidths=[2.2 * inch, 3.0 * inch])
        metadata_table.setStyle(TableStyle([
            ('SPAN', (0, 0), (1, 0)),
            ('BACKGROUND', (0, 0), (1, 0), colors.HexColor('#F8FAFC')),
            ('BOTTOMPADDING', (0, 0), (1, 0), 6),
            ('TOPPADDING', (0, 0), (1, 0), 6),
            ('TEXTCOLOR', (0, 0), (1, 0), colors.HexColor('#0F172A')),
            ('FONTNAME', (0, 0), (1, 0), 'Helvetica-Bold'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E2E8F0')),
            ('PADDING', (0, 0), (-1, -1), 6),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        verdict_text = f"ANALYSIS VERDICT: {prediction}"
        verdict_confidence = f"Confidence: {confidence * 100:.1f}% ({'AI Splicing/Face-Swap' if prediction == 'FAKE' else 'Authentic Facial Movements'})"
        
        verdict_data = [
            [Paragraph(verdict_text, verdict_title_style)],
            [Spacer(1, 4)],
            [Paragraph(verdict_confidence, verdict_desc_style)]
        ]
        verdict_table = Table(verdict_data, colWidths=[2.2 * inch])
        verdict_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(verdict_bg)),
            ('BOX', (0, 0), (-1, -1), 1.5, colors.HexColor(verdict_color)),
            ('PADDING', (0, 0), (-1, -1), 12),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ]))
        
        # Combine Metadata and Verdict into a single horizontal block
        top_layout_data = [[metadata_table, verdict_table]]
        top_layout_table = Table(top_layout_data, colWidths=[5.2 * inch, 2.2 * inch])
        top_layout_table.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (1, 0), (1, 0), 12),
            ('RIGHTPADDING', (0, 0), (0, 0), 0),
        ]))
        
        story.append(top_layout_table)
        story.append(Spacer(1, 15))
        
        # --- CHARTS SECTION ---
        story.append(Paragraph("Temporal Confidence Trend & Probability Distribution", h2_style))
        if os.path.exists(temp_chart_path):
            chart_img = Image(temp_chart_path, width=7.2 * inch, height=3.0 * inch)
            story.append(chart_img)
        story.append(Spacer(1, 15))
        
        # --- SUSPICIOUS FRAMES GALLERY ---
        story.append(PageBreak()) # Move detailed gallery to page 2
        story.append(Paragraph("Suspicious Frame Forensic Breakdown (Top 5)", h2_style))
        
        # Pull top 5 suspicious frames with faces
        top_frames = analysis_results.get("top_suspicious_frames", [])[:5]
        
        if not top_frames:
            story.append(Paragraph("No suspicious frames or faces detected to report.", body_style))
        else:
            for f_info in top_frames:
                frame_idx = f_info["frame_index"]
                timestamp = f_info["timestamp_ms"] / 1000.0
                prob_fake = f_info["prob_fake"]
                
                # Check for face crops
                faces = f_info.get("faces", [])
                if not faces:
                    continue
                    
                face = faces[0]  # Get primary face crop
                crop_rel = face.get("face_crop_path", "")
                overlay_rel = face.get("overlay_path", "")
                explanation = face.get("explanation", "Attention concentrated in facial regions.")
                
                crop_abs = os.path.join(base_dir, crop_rel) if crop_rel else ""
                overlay_abs = os.path.join(base_dir, overlay_rel) if overlay_rel else ""
                
                # Create visual block for this suspicious frame
                frame_header = Paragraph(
                    f"<b>Frame #{frame_idx}</b> (Timestamp: {timestamp:.2f}s) — <b>Deepfake Probability: {prob_fake * 100:.1f}%</b>",
                    body_style
                )
                
                # Images side by side
                img_data = []
                img_cols = []
                
                if crop_abs and os.path.exists(crop_abs):
                    img_data.append(Image(crop_abs, width=1.4 * inch, height=1.4 * inch))
                    img_cols.append(1.5 * inch)
                if overlay_abs and os.path.exists(overlay_abs):
                    img_data.append(Image(overlay_abs, width=1.4 * inch, height=1.4 * inch))
                    img_cols.append(1.5 * inch)
                    
                # Add explanation text
                exp_para = Paragraph(f"<b>Forensic Signature Analysis:</b><br/>{explanation}", body_style)
                img_data.append(exp_para)
                img_cols.append(4.2 * inch)
                
                frame_detail_table = Table([img_data], colWidths=img_cols)
                frame_detail_table.setStyle(TableStyle([
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
                    ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#F8FAFC')),
                    ('PADDING', (0, 0), (-1, -1), 8),
                ]))
                
                # Bundle the frame header and table so they don't break across pages
                story.append(KeepTogether([
                    frame_header,
                    Spacer(1, 4),
                    frame_detail_table,
                    Spacer(1, 12)
                ]))
                
        # Build Document
        doc.build(story)
        
        # Cleanup temporary chart files
        if os.path.exists(temp_chart_path):
            try:
                os.remove(temp_chart_path)
            except Exception:
                pass

    @staticmethod
    def _generate_charts(results: dict, save_path: str):
        """
        Uses Matplotlib to generate two plots side-by-side:
        1. Line chart of fake probability over frame timeline.
        2. Distribution histogram of frame-level predictions.
        """
        frames = results.get("frames", [])
        if not frames:
            return
            
        frame_indices = [f["frame_index"] for f in frames]
        prob_fake = [f["prob_fake"] for f in frames]
        
        # Initialize Matplotlib Figure with dark theme vibes, but clean white backgrounds for print
        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 4))
        
        # 1. Timeline Confidence Trend
        ax1.plot(frame_indices, prob_fake, color='#6366F1', linewidth=2, label='Deepfake Logit Probability')
        ax1.axhline(y=0.5, color='#EF4444', linestyle='--', label='Suspicious Threshold')
        ax1.fill_between(frame_indices, prob_fake, 0.5, where=(np.array(prob_fake) >= 0.5), color='#EF4444', alpha=0.15)
        ax1.fill_between(frame_indices, prob_fake, 0.5, where=(np.array(prob_fake) < 0.5), color='#10B981', alpha=0.1)
        ax1.set_ylim(-0.05, 1.05)
        ax1.set_xlabel("Sampled Frame Index", fontsize=9, fontweight='bold', color='#1E293B')
        ax1.set_ylabel("Probability score", fontsize=9, fontweight='bold', color='#1E293B')
        ax1.set_title("Temporal Confidence Timeline", fontsize=10, fontweight='bold', color='#0F172A')
        ax1.grid(True, linestyle=':', alpha=0.6)
        ax1.legend(loc='lower left', fontsize=8)
        
        # 2. Histogram / Distribution of scores
        # Filter scores of frames that actually contain faces
        face_scores = [f["prob_fake"] for f in frames if f["has_faces"]]
        if not face_scores:
            face_scores = [0.0]
            
        n, bins, patches = ax2.hist(face_scores, bins=10, range=(0, 1), rwidth=0.85)
        
        # Color patches based on boundary
        for bin_edge, patch in zip(bins, patches):
            if bin_edge >= 0.5:
                patch.set_facecolor('#EF4444')
            else:
                patch.set_facecolor('#10B981')
                
        ax2.set_xlabel("Probability Class", fontsize=9, fontweight='bold', color='#1E293B')
        ax2.set_ylabel("Frame Count", fontsize=9, fontweight='bold', color='#1E293B')
        ax2.set_title("Anomaly Score Distribution", fontsize=10, fontweight='bold', color='#0F172A')
        ax2.grid(True, linestyle=':', alpha=0.6)
        
        plt.tight_layout()
        plt.savefig(save_path, dpi=200)
        plt.close()
