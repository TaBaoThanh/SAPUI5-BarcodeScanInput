sap.ui.define([
	"sap/m/FlexBox",
	"sap/m/Button",
	"sap/m/Input",
	"sap/m/Dialog",
	"sap/m/Toolbar",
	"sap/m/Title",
	"sap/ui/Device",
	"sap/ui/model/resource/ResourceModel",
	"sap/m/custom/BarcodeScanInput/control/html5-qrcode-min"
], function (FlexBox, Button, Input, Dialog, Toolbar, Title, Device, ResourceModel, html5QRCode) {
	"use strict";

	var barcodeScanInput = Input.extend("thanh.m.BarcodeScanInput", {
		metadata: {
			properties: {
				parsedBarcode: {
					type: "string",
					defaultValue: ""
				}
			},
			aggregations: {},
			events: {
				parseBarcode: {
					parameters: {
						barcode: {
							type: "string"
						}
					}
				},
				scanFinished: {
					parameters: {
						barcode: {
							type: "string"
						}
					}
				},
				takePhoto: {
					parameters: {
						ImageSrc: {
							type: "string"
						}
					}
				}
			}
		},

		// use default renderer
		renderer: {},

		constructor: function () {
			Input.prototype.constructor.apply(this, arguments);

			this._checkScanningFunction();

			// deviceready is only fired in fiori client. there we need to check again if cordova is available, because of a timing problem on some devices.
			// cordova was not yet loaded
			document.addEventListener("deviceready", jQuery.proxy(this._checkScanningFunction, this));
		},
		/**
		 * Checks if cordova or getUserMedia is supported and shows/hides the button for scanning.
		 */
		_checkScanningFunction: function () {
			this._isUserMediaSupported = true;

			if (window.cordova) {
				this._isCordova = true;
			}

			// barcode-functionality only if getusermedia or cordova supported
			if (this._isUserMediaSupported || this._isCordova) {
				this.setShowValueHelp(true);
				this.attachValueHelpRequest(this._scanBarcode);

				// set barcode-icon instead of the valuehelp-icon
				var valueHelpIcon = this._getValueHelpIcon();
				if (valueHelpIcon) {
					valueHelpIcon.setSrc("sap-icon://bar-code");
				}

			} else {
				this.setShowValueHelp(false);
			}

			var that = this;
			// preferred way of scanning is the cordova plugin. therefore we only attach the orientationchange event if cordova is not available
			if (this._isUserMediaSupported && !this._isCordova) {
				window.addEventListener("orientationchange", function () {
					// alert(screen.orientation.angle);
					if (that._html5QrcodeScanner && that._scanDialog) {
						if (that._html5QrcodeScanner.html5Qrcode && that._scanDialog.isOpen()) {
							that._html5QrcodeScanner.clear();
							that._inithtml5QrcodeScanner();
						}
					}
				});
			}
		},

		_scanBarcode: function () {
			if (this._isCordova) {
				this._scanBarcodeWithCordova();
			} else if (this._isUserMediaSupported) {
				this._scanBarcodeWithUserMedia();
			}
		},

		_scanBarcodeWithCordova: function () {
			var that = this;
			cordova.plugins.barcodeScanner.scan(function (result) {
				if (result.cancelled) {
					jQuery.sap.log.error("BarcodeScan cancelled!");
					return;
				}
				that._scanSuccess(result.text);

			}, function (error) {
				// if options are specified, the error-callback is mandatory!
				jQuery.sap.log.error("BarcodeScan failed: " + error);

			}, {
				// all available formats
				formats: "QR_CODE,DATA_MATRIX,UPC_A,UPC_E,EAN_8,EAN_13,CODE_39,CODE_93,CODE_128,CODABAR,ITF,RSS14,PDF_417,RSS_EXPANDED,MSI,AZTEC"
			});
		},

		_scanBarcodeWithUserMedia: function () {
			this._scanDialog = this._getScanDialog();
			this._scanDialog.open();
			this._inithtml5QrcodeScanner();
		},

		_onPictureTaken: function () {
			var canvas = document.getElementById('qr-canvas');
			var video = canvas.previousElementSibling;
			var that = this;
			
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight); // for drawing the video element on the canvas
			canvas.toBlob(function(blob) {
				// Canvas element gives a callback to listen to the event after blob is prepared from canvas
				var img = new Image();
				img.src = URL.createObjectURL(blob);
				// Get the base64 image
				var reader = new window.FileReader();
				reader.readAsDataURL(blob);
				reader.onloadend = function () {
				     var base64data = reader.result;
				     that.fireTakePhoto({
						ImageSrc: base64data
					});
				}
			});
		},

		_closeDialog: function (oEvent) {
			this._html5QrcodeScanner.clear();
			this._scanDialog.close();
			this._scanDialog.destroy();
		},

		_getScanDialog: function () {
			var that = this;
			var sHtmlVideoArea = "<div id='qr-reader' style='width: 400px'></div>";
			var oHtmlVideoArea = new sap.ui.core.HTML().setContent(sHtmlVideoArea);
			var oDialog = new Dialog({
				stretch: Device.system.phone,
				customHeader: new Toolbar({
					content: [
						new Title({
							text: "Scan"
						}).addStyleClass("sapUiSmallMarginBegin"),
					]
				}),
				content: [
					new FlexBox({
						alignItems: "Center",
						justifyContent: "Center",
						items: [oHtmlVideoArea]
					})
				],
				buttons: [
					new Button({
						text: "Take Picture",
						press: jQuery.proxy(this._onPictureTaken, this),
						type: "Accept"
					}),
					new Button({
						text: "Cancel",
						press: jQuery.proxy(this._closeDialog, this),
						type: "Reject"
					})
				]
			});

			return oDialog;
		},

		_inithtml5QrcodeScanner: function () {
			var that = this;
			this._html5QrcodeScanner = new Html5QrcodeScanner(
				"qr-reader", {
					fps: 10,
					qrbox: 250
				});
			this._html5QrcodeScanner.render(
				function onScanSuccess(decodedText, decodedResult) {
					that._scanSuccess(decodedResult.result);
					that._closeDialog();
				}
			);
			//Remove info icon
			$("#qr-reader").find('img').remove();
		},

		_scanSuccess: function (result) {
			var sBarcode = result.text;
			this.fireParseBarcode({
				barcode: sBarcode
			});

			var parsedBarcode = this.getProperty("parsedBarcode");
			if (parsedBarcode) {
				this.setValue(parsedBarcode);
				this.setProperty("parsedBarcode", "");
				this.fireChangeEvent(parsedBarcode);
			} else {
				this.setValue(sBarcode);
				this.fireChangeEvent(sBarcode);
			}

			this.fireScanFinished({
				barcode: sBarcode
			});
		}
	});

	return barcodeScanInput;

});